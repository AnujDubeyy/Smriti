import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';

const locale=z.enum(['en-IN','hi-IN','mr-IN']);
const short=z.string().trim().min(2).max(120);
const schema=z.discriminatedUnion('role',[
 z.object({
  role:z.literal('doctor'),doctor_name:short,registration_number:z.string().trim().min(4).max(80),
  organization:z.string().trim().max(160).default(''),
  specialty:z.string().trim().max(100).default(''),locale
 }).strict(),
 z.object({
  role:z.literal('caregiver'),caregiver_name:short,
  patient_name:short,date_of_birth:z.iso.date(),
  sex:z.enum(['female','male','intersex','prefer_not_to_say']),
  family_count:z.coerce.number().int().min(0).max(50),
  relationship:z.string().trim().min(2).max(100),
  support_notes:z.string().trim().max(2000).default(''),
  locale,authorized:z.literal(true),
  audio_capture:z.boolean(),transcript_retention:z.boolean(),personalization:z.boolean()
 }).strict()
]);
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const client=await requireCare();
  const raw=await limitedBody(request,12000);
  if(raw===null)throw new CareError('payload_too_large',413);
  const data=schema.parse(JSON.parse(raw));
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)throw new CareError('unauthorized',401);
  const {data:profile,error:profileError}=await client.from('app_users')
   .select('onboarding_role,clinician_verification_status').eq('id',user.id).single();
  if(profileError)throw profileError;
  // Changing a verified doctor's role does not revoke actual clinical privileges.
  // Never use onboarding_role to authorize access to records.
  if(profile.onboarding_role && profile.onboarding_role!==data.role)
   throw new CareError('role_already_selected',409);

  const preferences=data.role==='doctor'
   ? {onboarding_role:'doctor',display_name:data.doctor_name,preferred_locale:data.locale,
      professional_profile:{registration_number:data.registration_number,
       organization:data.organization,specialty:data.specialty}}
   : {onboarding_role:'caregiver',display_name:data.caregiver_name,preferred_locale:data.locale};

  const {error:updateError}=await client.from('app_users').update(preferences).eq('id',user.id);
  if(updateError)throw updateError;

  if(data.role==='doctor'){
   // Verification is always a human-reviewed request, never granted at signup.
   const {error}=await client.rpc('smriti_command',{
    operation:'verification_request',input:{kind:'clinician'}
   });
   if(error)throw error;
   return json({ok:true,next:'/doctor'});
  }

  const {role,...patientInput}=data;
  const {data:result,error}=await client.rpc('smriti_setup',{input:patientInput});
  if(error)throw error;
  return json({ok:true,patient_id:result.patient_id,next:'/'});
 }catch(error){return failure(error);}
}
