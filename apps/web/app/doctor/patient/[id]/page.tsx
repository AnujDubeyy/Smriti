import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {z} from 'zod';
import {requireAccount} from '../../../../lib/page-access';
import {LogsPanel} from '../../../../components/logs-panel';
export const dynamic='force-dynamic';
export default async function DoctorPatient({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const client=await requireAccount();
 const {data:{user}}=await client.auth.getUser();
 const {data:doctor}=await client.from('app_users').select('onboarding_role,clinician_verification_status').eq('id',user!.id).single();
 if(!doctor||doctor.onboarding_role!=='doctor')redirect('/');
 if(doctor.clinician_verification_status!=='verified')redirect('/doctor');
 const {data:membership}=await client.from('patient_memberships').select('role,status').eq('user_id',user!.id).eq('patient_id',id).maybeSingle();
 if(!membership||membership.role!=='clinician'||membership.status!=='active')notFound();
 const {data:patient}=await client.from('patients').select('id,preferred_name').eq('id',id).maybeSingle();
 if(!patient)notFound();
 return <section className="doctor-patient">
  <p><Link href="/doctor">Back to doctor workspace</Link></p>
  <span className="eyebrow">CLINICAL MONITORING</span>
  <h1>{patient.preferred_name}</h1>
  <p className="intro">Authorized observations and conversation logs. AI summaries require clinician review.</p>
  <LogsPanel patientId={patient.id}/>
 </section>;
}
