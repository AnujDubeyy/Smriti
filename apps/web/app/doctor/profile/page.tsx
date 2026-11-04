import Link from 'next/link';
import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../../lib/auth/access';
import {ProfileEditor} from '../../../components/profile-editor';
export const dynamic='force-dynamic';
export default async function DoctorProfile(){
 const auth=await authenticatedClient();
 if(!auth.client||!auth.user)redirect('/login');
 const {data:account,error}=await auth.client.from('app_users')
  .select('onboarding_role').eq('id',auth.user.id).single();
 if(error||!account)return <section role="alert">Unable to open doctor account.</section>;
 if(account.onboarding_role!=='doctor')redirect('/');
 return <section style={{maxWidth:720,margin:'0 auto'}}>
  <p><Link href="/doctor">← Back to doctor workspace</Link></p>
  <h1>Doctor profile</h1>
  <p>Update your professional details and sign-in information.</p>
  <p style={{marginTop:12}}><Link className="button secondary" href="/onboarding">Edit professional profile</Link></p>
  <ProfileEditor role="doctor" isAnonymous={!!auth.user.is_anonymous} email={auth.user.email}/>
 </section>;
}
