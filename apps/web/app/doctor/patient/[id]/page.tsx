import {localDoctorPreview,demoPatients} from '../../../../lib/local-doctor-preview';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {z} from 'zod';
import {requireAccount} from '../../../../lib/page-access';
import {LogsPanel} from '../../../../components/logs-panel';
export const dynamic='force-dynamic';
export default async function DoctorPatient({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 if(localDoctorPreview()&&id===demoPatients[0].patient_id)return <section className="doctor-patient"><p className="eyebrow">FICTIONAL PATIENT</p><h1>{demoPatients[0].patient_name}</h1><p>Caretaker: {demoPatients[0].caretaker_name}</p><Link className="button assessment" href={'/doctor/assessments?patient='+id}>Assign assessment</Link><LogsPanel patientId={id} readOnly localPreview/></section>;
 const client=await requireAccount();
 const {data:{user}}=await client.auth.getUser();
 const {data:doctor}=await client.from('app_users').select('onboarding_role').eq('id',user!.id).single();
 if(!doctor||doctor.onboarding_role!=='doctor')redirect('/');
 const {data:membership}=await client.from('patient_memberships').select('role,status').eq('user_id',user!.id).eq('patient_id',id).maybeSingle();
 if(!membership||membership.role!=='clinician'||membership.status!=='active')notFound();
 const {data:patient}=await client.from('patients').select('id,preferred_name,synthetic').eq('id',id).maybeSingle();
 if(!patient||!patient.synthetic)notFound();
 return <section className="doctor-patient">
  <p><Link href="/doctor">← Back to patients</Link></p>
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
