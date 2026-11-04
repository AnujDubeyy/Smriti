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
 const full=account.display_name||'Doctor';
 return <section className="doctor-home">
  <span className="eyebrow">DOCTOR WORKSPACE</span>
  <h1>Welcome, {full}</h1>
  <p className="intro">Review authorized fictional patient profiles and their monitoring information.</p>
  <div className="doctor-onboarding-next">
   <h2>Your patients</h2>
   {membershipError||patientError?<p role="alert">Could not load your patient connections. Please try again.</p>
    :patients?.length
     ?<ul className="doctor-patient-list">{patients.map(p=><li key={p.id}><strong>{p.preferred_name}</strong><Link className="button secondary" href={'/doctor/patient/'+p.id}>Open care record</Link></li>)}</ul>
     :<p>No fictional patients are connected yet. Ask a caregiver to invite this account using your login email.</p>}
   <Link className="button monitoring" href="/accept-invite">Accept patient invitation</Link>
  </div>
  <div className="doctor-status">
   <div><strong>Account details</strong><p>Doctor workspace</p></div>
   <Link className="button secondary" href="/onboarding">Edit your details</Link>
  </div>
  <p className="small">This is a test environment for fictional patient profiles. Patient-specific access requires an invitation and permission to share, not a doctor verification request.</p>
 </section>;
}
