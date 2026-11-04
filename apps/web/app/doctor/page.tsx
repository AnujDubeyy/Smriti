import Link from 'next/link';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../lib/auth/access';
import {DoctorQrForm} from '../../components/doctor-qr-form';
import {DoctorIntakeEditor} from '../../components/doctor-intake-editor';
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
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const [{data:account,error:accountError},{data:roster,error:rosterError}]=await Promise.all([
  auth.client.from('app_users').select('onboarding_role,display_name').eq('id',auth.user.id).single(),
  auth.client.rpc('smriti_doctor_qr_roster')
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
    :count>0?<ul className="doctor-patient-list">{invitations.map(item=><li key={item.patient_id} style={{alignItems:'center',gap:14}}>
      <div style={{flex:1}}>
       <strong>{item.patient_name}</strong>
       <p style={{fontSize:13,margin:'4px 0'}}>Caretaker: {item.caretaker_name}</p>
       <span style={{fontSize:13,color:'#665d4e',fontWeight:750}}>
        {item.status==='joined'
         ?item.sharing_enabled?'Caretaker connected · Sharing enabled':'Caretaker connected · Sharing not yet enabled'
         :item.status==='expired'?'Invitation expired':'Waiting for caretaker to scan QR'}
       </span>
       <DoctorIntakeEditor patientId={item.patient_id} initial={item.clinical_intake||null}/>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'flex-end'}}>
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
  <DoctorQrForm existingCount={count}/>
  <div className="doctor-status">
   <div><strong>Your profile</strong><p>Doctor workspace</p></div>
   <Link className="button secondary" href="/profile">Profile settings</Link>
  </div>
  <p className="small">The clinical intake is based on clinician-entered fictional test information. Smriti does not calculate a diagnosis or dementia stage.</p>
 </section>;
}
