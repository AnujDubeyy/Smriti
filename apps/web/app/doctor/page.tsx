import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAccount} from '../../lib/page-access';
export const dynamic='force-dynamic';
export default async function DoctorWorkspace(){
 const client=await requireAccount();
 const {data:{user}}=await client.auth.getUser();
 const {data:account,error}=await client.from('app_users')
  .select('onboarding_role,display_name,clinician_verification_status,professional_profile')
  .eq('id',user!.id).single();
 if(error||!account)return <section><h1>Unable to load your account</h1><p>Try again.</p></section>;
 if(account.onboarding_role!=='doctor')redirect('/');
 const verified=account.clinician_verification_status==='verified';
 const {data:patients}=verified?await client.from('patients').select('id,preferred_name')
  .order('created_at').limit(100):{data:[]};
 const full=account.display_name||'Doctor';
 return <section className="doctor-home">
  <span className="eyebrow">DOCTOR WORKSPACE</span>
  <h1>Welcome, {full}</h1>
  <p className="intro">Manage clinical access and monitor patients you are authorized to review.</p>
  <div className="doctor-status">
   <div><strong>Verification status</strong>
    <p>{verified?'Verified clinician':account.clinician_verification_status==='pending'?'Verification requested':'Not yet verified'}</p>
   </div>
   <Link className="button secondary" href="/onboarding">Review professional details</Link>
  </div>
  {!verified?<div className="doctor-onboarding-next">
   <h2>What happens next?</h2>
   <p>Your professional details were saved and a verification request was submitted. Clinical records and patient assessments remain locked until a reviewer approves your credentials.</p>
   <p>Once verified, you can accept a patient invitation and open their monitoring history with their consent.</p>
  </div>:<>
   <div className="doctor-onboarding-next">
    <h2>Your patient connections</h2>
    {!patients?.length?<p>No patients connected yet. Ask the patient's authorized caregiver to send an invitation, then accept it using the link below.</p>
     :<ul className="doctor-patient-list">{patients.map(p=><li key={p.id}><strong>{p.preferred_name}</strong><Link className="button secondary" href={'/doctor/patient/'+p.id}>Open care record</Link></li>)}</ul>}
    <Link className="button monitoring" href="/accept-invite">Accept a patient invitation</Link>
   </div>
  </>}
 </section>;
}
