import {localDoctorPreview,demoPatients} from '../../../lib/local-doctor-preview';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../../lib/auth/access';
import {DoctorPatientOverview} from '../../../components/doctor-patient-overview';
export const dynamic='force-dynamic';
export default async function Page(){
 if(localDoctorPreview())return <DoctorPatientOverview patients={demoPatients} focus="conversations"/>;
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const [{data:account,error},{data:roster,error:rosterError}]=await Promise.all([
  auth.client.from('app_users').select('onboarding_role').eq('id',auth.user.id).single(),
  auth.client.rpc('smriti_doctor_qr_roster')
 ]);
 if(error||!account)return <section role="alert">Could not load account.</section>;
 if(account.onboarding_role!=='doctor')redirect('/');
 if(rosterError)return <section role="alert">Could not load your patient list.</section>;
 return <DoctorPatientOverview patients={Array.isArray(roster)?roster:[]} focus="conversations"/>;
}
