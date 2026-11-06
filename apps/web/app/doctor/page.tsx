import {localDoctorPreview,demoPatients} from '../../lib/local-doctor-preview';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../lib/auth/access';
import {DoctorQrForm} from '../../components/doctor-qr-form';
import {DoctorIntakeEditor} from '../../components/doctor-intake-editor';
import cards from '../../components/doctor-patient-card.module.css';
export const dynamic='force-dynamic';

type PatientInvite={
 patient_id:string;patient_name:string;caretaker_name:string;
 status:'joined'|'pending'|'expired';sharing_enabled:boolean;
 clinical_intake?:{blood_group?:string;diagnoses?:string[];diagnosis_status?:string;dementia_stage?:string;daily_support?:string;communication_support?:string[];other_condition?:string};
};
export default async function DoctorWorkspace(){
 // authenticatedClient already verifies the session. Avoid a second auth.getUser
 // and do not make extra membership/patient queries: the scoped roster RPC
 // returns current doctor-owned invitations and sharing status in one call.
 const localPreview=localDoctorPreview();
 const auth=localPreview?null:await authenticatedClient();
 if(!localPreview&&(!auth?.client||!auth.user))redirect('/login');
 const [{data:account,error:accountError},{data:roster,error:rosterError}]=localPreview?[{data:{onboarding_role:'doctor',display_name:'Doctor'},error:null},{data:demoPatients,error:null}]:await Promise.all([
  auth!.client!.from('app_users').select('onboarding_role,display_name').eq('id',auth!.user!.id).single(),
  auth!.client!.rpc('smriti_doctor_qr_roster')
 ]);
 if(accountError||!account)return <section role="status"><h1>Account unavailable</h1><p>Please refresh and try again.</p></section>;
 if(account.onboarding_role!=='doctor')redirect('/');
 const invitations=Array.isArray(roster)?roster as PatientInvite[]:[];
 const count=invitations.length;
 return <section className="doctor-home">
  <span className="eyebrow">DOCTOR WORKSPACE</span>
  <h1>Welcome, {account.display_name||'Doctor'}</h1>
  <p className="intro">Manage fictional patient profiles and connected caretakers.</p>
  <div className="doctor-workspace-shortcuts" aria-label="Doctor workspace shortcuts">
   <Link href="/doctor/assessments" className="button assessment">Assign assessments</Link>
   <Link href="/doctor/monitoring" className="button monitoring">Monitoring</Link>
   <Link href="/doctor/conversations" className="button secondary">Conversations</Link>
  </div>
  <div className="doctor-onboarding-next">
   <h2>Your patients {count>0?'('+count+')':''}</h2>
   {rosterError?<p role="alert">Patient statuses could not be loaded. Refresh the page. Existing profiles have not been deleted.</p>
    :count>0?<ul className={cards.list}>{invitations.map(item=><li key={item.patient_id} className={cards.card}>
      <div className={cards.identity}>
       <strong>{item.patient_name}</strong>
       <p style={{fontSize:13,margin:'4px 0'}}>Caretaker: {item.caretaker_name}</p>
       <span className={cards.status}>
        {item.status==='joined'
         ?item.sharing_enabled?'Caretaker connected · Sharing enabled':'Caretaker connected · Sharing not yet enabled'
         :item.status==='expired'?'Invitation expired':'Waiting for caretaker to scan QR'}
       </span>
      </div>
      <DoctorIntakeEditor patientId={item.patient_id} initial={item.clinical_intake||null} preview={localPreview}/>
      <div className={cards.actions}>
       {item.status==='joined'&&item.sharing_enabled?
        <>
         <Link className="button secondary" href={'/doctor/assessments?patient='+item.patient_id}>Assign assessment</Link>
         <Link className="button secondary" href={'/doctor/patient/'+item.patient_id}>Open monitoring</Link>
        </>:<Link className="button secondary" href={'/doctor/assessments?patient='+item.patient_id}>Assessment options</Link>}
      </div>
     </li>)}</ul>
    :<p>No patients created yet. Use the form below to create your first profile and invite a caretaker by QR.</p>}
   {invitations.some(x=>x.status==='joined'&&!x.sharing_enabled)
    ?<p style={{fontSize:13,color:'#655e52',marginTop:12}}>The caretaker is connected. For privacy, your clinical monitoring access opens only after they enable doctor sharing in their profile.</p>:null}
  </div>
  {localPreview?<p className="preview-note">Demo patient is ready. Use Patient view above to try the caretaker experience.</p>:<DoctorQrForm existingCount={count}/>}
  <div className="doctor-status">
   <div><strong>Your profile</strong><p>Doctor workspace</p></div>
   <Link className="button secondary" href="/doctor/profile">Profile settings</Link>
  </div>
 </section>;
}
