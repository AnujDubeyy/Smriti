import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';
const schema=z.object({
 role:z.literal('doctor'),doctor_name:z.string().trim().min(2).max(120),
 organization:z.string().trim().max(160).default(''),
 specialty:z.string().trim().max(100).default(''),
 locale:z.enum(['en-IN','hi-IN','mr-IN'])
}).strict();
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const client=await requireCare();
  const raw=await limitedBody(request,12000);
  if(raw===null)throw new CareError('payload_too_large',413);
  const data=schema.parse(JSON.parse(raw));
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user||user.is_anonymous)throw new CareError('unauthorized',401);
  const {data:profile,error:profileError}=await client.from('app_users')
   .select('onboarding_role').eq('id',user.id).single();
  if(profileError)throw profileError;
  if(profile.onboarding_role&&profile.onboarding_role!=='doctor')
   throw new CareError('role_already_selected',409);
  const {error:updateError}=await client.from('app_users')
   .update({onboarding_role:'doctor',display_name:data.doctor_name,
    preferred_locale:data.locale,professional_profile:{
     organization:data.organization,specialty:data.specialty}})
   .eq('id',user.id);
  if(updateError)throw updateError;
  return json({ok:true,next:'/doctor'});
 }catch(error){return failure(error);}
}
