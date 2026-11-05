import {CareHome} from '../components/care-home';
import {localDoctorPreview,demoPatients} from '../lib/local-doctor-preview';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../lib/auth/access';
export const dynamic='force-dynamic';
export default async function Home(){
 if(localDoctorPreview())return <CareHome name="Ramesh" patientId={demoPatients[0].patient_id} localPreview/>;
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const {data:account,error:accountError}=await auth.client.from('app_users')
  .select('onboarding_role,display_name').eq('id',auth.user.id).maybeSingle();
 if(accountError||!account)return <section role="status"><h1>Account unavailable</h1><p>We could not load your account. Please try again.</p></section>;
 if(!account.onboarding_role)redirect('/onboarding');
 if(account.onboarding_role==='doctor')redirect('/doctor');
 const {data:patient,error}=await auth.client.from('patients')
  .select('id,preferred_name,care_details').eq('linked_user_id',auth.user.id)
  .order('created_at').limit(1).maybeSingle();
 if(error)return <section><h1>Care profile unavailable</h1><p>Please try again.</p></section>;
 if(!patient?.care_details)redirect('/onboarding');
 return <CareHome name={patient.preferred_name} patientId={patient.id}/>;
}
