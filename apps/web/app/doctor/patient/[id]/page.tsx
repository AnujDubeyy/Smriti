import {localDoctorPreview,demoPatients} from '../../../../lib/local-doctor-preview';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {z} from 'zod';
import {authenticatedClient} from '../../../../lib/auth/access';
import {LogsPanel} from '../../../../components/logs-panel';
export const dynamic='force-dynamic';
export default async function DoctorPatient({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 if(localDoctorPreview()&&id===demoPatients[0].patient_id)return <section className="doctor-patient"><p className="eyebrow">FICTIONAL PATIENT</p><h1>{demoPatients[0].patient_name}</h1><p>Caretaker: {demoPatients[0].caretaker_name}</p><Link className="button assessment" href={'/doctor/assessments?patient='+id}>Assign assessment</Link><LogsPanel patientId={id} readOnly localPreview/></section>;
 const {client,user}=await authenticatedClient();
 if(!client||!user)redirect('/login');
 const [{data:doctor},{data:membership},{data:patient}]=await Promise.all([
  client.from('app_users').select('onboarding_role').eq('id',user.id).single(),
  client.from('patient_memberships').select('role,status').eq('user_id',user.id).eq('patient_id',id).maybeSingle(),
  client.from('patients').select('id,preferred_name,synthetic').eq('id',id).maybeSingle()
 ]);
 if(doctor?.onboarding_role!=='doctor')redirect('/');
 if(membership?.role!=='clinician'||membership.status!=='active'||!patient?.synthetic)notFound();
 return <section className="doctor-patient">
  <div className="doctor-workspace-shortcuts">
   <Link className="button secondary" href={'/doctor/assessments?patient='+id}>Assign assessment</Link>
   <Link className="button secondary" href={'/doctor/monitoring'}>Monitoring</Link>
   <Link className="button secondary" href={'/doctor/conversations'}>Conversations</Link>
  </div>
  <span className="eyebrow">FICTIONAL PATIENT MONITORING</span>
  <h1>{patient.preferred_name}</h1>
  <p className="intro">Authorized observations and conversation logs. AI summaries require clinician review.</p>
  <LogsPanel patientId={patient.id} readOnly/>
 </section>;
}
