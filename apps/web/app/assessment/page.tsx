import {localDoctorPreview,demoPatients} from '../../lib/local-doctor-preview';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../lib/auth/access';
import {PatientAssessments} from '../../components/patient-assessments';
import type {Assignment} from '../../lib/assessment-activities';
export const dynamic='force-dynamic';
export default async function AssessmentPage(){
 if(localDoctorPreview())return <PatientAssessments patientId={demoPatients[0].patient_id} name="Ramesh" locale="hi-IN" initial={[]} localPreview/>;
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const [{data:account},{data:patient,error:patientError}]=await Promise.all([
  auth.client.from('app_users').select('onboarding_role').eq('id',auth.user.id).single(),
  auth.client.from('patients').select('id,preferred_name,locale')
   .eq('linked_user_id',auth.user.id).eq('synthetic',true)
   .order('created_at',{ascending:false}).limit(1).maybeSingle()
 ]);
 if(account?.onboarding_role==='doctor')redirect('/doctor/assessments');
 if(patientError||!patient)return <section><h1>No connected patient</h1><p>Ask the doctor for a new QR invitation.</p></section>;
 const {data,error}=await auth.client.rpc('smriti_caretaker_assessments',{
  operation:'list',input:{patient_id:patient.id}
 });
 return error?<section><h1>Assessments unavailable</h1><p>We could not load your assigned activities. Please refresh.</p></section>
  :<PatientAssessments patientId={patient.id} name={patient.preferred_name} locale={patient.locale}
    initial={Array.isArray(data)?data as Assignment[]:[]}/>;
}
