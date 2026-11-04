import {requireAccount} from '../../lib/page-access';
import {OnboardingFlow} from '../../components/onboarding-flow';
export const dynamic='force-dynamic';
export default async function Page(){
 const client=await requireAccount();
 const {data:{user}}=await client.auth.getUser();
 const {data:profile,error}=await client.from('app_users')
  .select('onboarding_role,display_name,preferred_locale,professional_profile')
  .eq('id',user!.id).single();
 if(error)throw new Error('Unable to load your account.');
 const {data:patient}=await client.from('patients')
  .select('preferred_name,locale,care_details')
  .eq('linked_user_id',user!.id).order('created_at').limit(1).maybeSingle();
 const details=(patient?.care_details&&typeof patient.care_details==='object'
   ?patient.care_details:{}) as Record<string,unknown>;
 const professional=(profile.professional_profile&&typeof profile.professional_profile==='object'
   ?profile.professional_profile:{}) as Record<string,unknown>;
 const selected=profile.onboarding_role==='doctor'||profile.onboarding_role==='caregiver'
  ?profile.onboarding_role:null;
 return <OnboardingFlow
  initialRole={selected} initialName={profile.display_name||''}
  initialPatient={{...details,patient_name:patient?.preferred_name||'',locale:patient?.locale||profile.preferred_locale}}
  initialProfessional={{...professional,doctor_name:profile.display_name||'',locale:profile.preferred_locale}}
 />;
}
