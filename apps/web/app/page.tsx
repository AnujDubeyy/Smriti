import Link from 'next/link';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../lib/auth/access';
export const dynamic='force-dynamic';
export default async function Home(){
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const {data:account,error:accountError}=await auth.client.from('app_users')
  .select('onboarding_role,display_name').eq('id',auth.user.id).maybeSingle();
 if(accountError||!account)return <section role="status"><h1>Account unavailable</h1><p>We could not load your account. Please try again.</p></section>;
 if(!account.onboarding_role)redirect('/onboarding');
 if(account.onboarding_role==='doctor')redirect('/doctor');
 const {data:patient,error}=await auth.client.from('patients')
  .select('id,preferred_name,care_details').eq('linked_user_id',auth.user.id)
  .order('created_at').limit(1).maybeSingle();
 if(error)return <section><h1>Care profile unavailable</h1><p>Please try again.</p></section>;
 if(!patient?.care_details)redirect('/onboarding');
 const name=patient.preferred_name;
 return <section className="care-home">
  <p className="eyebrow">PATIENT & CAREGIVER</p>
  <h1>Welcome, {name}</h1>
  <p className="intro">Your Smriti space. Choose what you want to do today.</p>
  <div className="care-home-grid">
   <Link className="care-home-tile talk" href="/companionship">
    <span className="care-home-icon" aria-hidden="true">☎</span><strong>Talk to Smriti</strong><span>A calm voice conversation in your chosen language</span><b>Start call</b>
   </Link>
   <Link className="care-home-tile observe" href="/monitoring">
    <span className="care-home-icon" aria-hidden="true">◷</span><strong>Daily observations</strong><span>Record what happened and review the care timeline</span><b>Open monitoring</b>
   </Link>
   <Link className="care-home-tile assessments" href="/assessment">
    <span className="care-home-icon" aria-hidden="true">✓</span><strong>Assessments</strong><span>See activities assigned by the care team</span><b>View activities</b>
   </Link>
  </div>
  <div className="care-home-links">
   <Link href="/profile">Edit patient details & login</Link>
   <Link href={'/permissions?patient='+patient.id}>Care permissions</Link>
   <Link href="/accept-invite">Accept an invitation</Link>
  </div>
 </section>;
}
