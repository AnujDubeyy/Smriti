import {DoctorQrForm} from '../../components/doctor-qr-form';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAccount} from '../../lib/page-access';
export const dynamic='force-dynamic';
export default async function DoctorWorkspace(){
 const client=await requireAccount();
 const {data:{user}}=await client.auth.getUser();
 const {data:account,error}=await client.from('app_users')
  .select('onboarding_role,display_name')
  .eq('id',user!.id).single();
 if(error||!account)return <section><h1>Unable to load your account</h1><p>Try again.</p></section>;
 if(account.onboarding_role!=='doctor')redirect('/');
 const {data:memberships,error:membershipError}=await client.from('patient_memberships')
  .select('patient_id,role,status').eq('user_id',user!.id).eq('role','clinician').eq('status','active').limit(100);
 const ids=(memberships||[]).map(x=>x.patient_id);
 const {data:patients,error:patientError}=ids.length
  ?await client.from('patients').select('id,preferred_name,synthetic').in('id',ids).eq('synthetic',true)
  :{data:[],error:null};
 const {data:roster}=await client.rpc('smriti_doctor_qr_roster');
 const invitations=Array.isArray(roster)?roster as Array<{patient_id:string;patient_name:string;caretaker_name:string;status:string;sharing_enabled:boolean}>:[];
 const full=account.display_name||'Doctor';
 return <section className="doctor-home">
  <span className="eyebrow">DOCTOR WORKSPACE</span>
  <h1>Welcome, {full}</h1>
  <p className="intro">Review authorized fictional patient profiles and their monitoring information.</p>
  <div className="doctor-onboarding-next">
   <h2>Your connected patients</h2>
   {membershipError||patientError?<p role="alert">Could not load your patient connections. Please try again.</p>
    :patients?.length
     ?<ul className="doctor-patient-list">{patients.map(p=><li key={p.id}><strong>{p.preferred_name}</strong><Link className="button secondary" href={'/doctor/patient/'+p.id}>Open care record</Link></li>)}</ul>
     :<p>No caretaker has shared a fictional patient profile with you yet. Create a profile below and share its QR code.</p>}

  </div>
  <DoctorQrForm/>
  <section className="doctor-onboarding-next">
   <h2>QR invitations</h2>
   <p>Profiles you created and shared. New QR links expire after 48 hours and cannot be reused.</p>
   {invitations.length? <ul className="doctor-patient-list">{invitations.map(item=><li key={item.patient_id} style={{alignItems:'flex-start'}}>
    <div><strong>{item.patient_name}</strong>
     <p style={{fontSize:13,marginTop:3}}>Caretaker: {item.caretaker_name}</p>
     <span style={{fontSize:12,fontWeight:750}}>{item.status==='joined'?'Connected':item.status==='expired'?'QR expired':'Waiting for caretaker'}{item.sharing_enabled?' · Doctor sharing enabled':''}</span>
    </div>
    {item.status==='joined'&&item.sharing_enabled?<Link className="button secondary" href={'/doctor/patient/'+item.patient_id}>Open</Link>:null}
   </li>)}</ul>:<p>No QR invitations yet.</p>}
  </section>
  <div className="doctor-status">
   <div><strong>Account details</strong><p>Doctor workspace</p></div>
   <Link className="button secondary" href="/onboarding">Edit your details</Link>
  </div>
  <p className="small">Doctor-created profiles connect to caretakers through one-time QR invitations. Clinician access to patient information still requires caretaker sharing permission.</p>
 </section>;
}
