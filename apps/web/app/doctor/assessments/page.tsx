import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../../lib/auth/access';
import {DoctorAssessmentManager} from '../../../components/doctor-assessment-manager';
export const dynamic='force-dynamic';
type Patient={patient_id:string;patient_name:string;caretaker_name:string;status:string;sharing_enabled:boolean};
export default async function DoctorAssessments({
 searchParams
}:{searchParams:Promise<{patient?:string}>}){
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const [{data:account,error},{data:roster,error:rosterError}]=await Promise.all([
  auth.client.from('app_users').select('onboarding_role').eq('id',auth.user.id).single(),
  auth.client.rpc('smriti_doctor_qr_roster')
 ]);
 if(error||!account)return <section role="alert">Could not load your doctor account.</section>;
 if(account.onboarding_role!=='doctor')redirect('/');
 if(rosterError)return <section role="alert">Could not load your patients. Refresh and try again.</section>;
 const params=await searchParams;
 return <DoctorAssessmentManager patients={Array.isArray(roster)?roster as Patient[]:[]} initialPatient={params.patient}/>;
}
