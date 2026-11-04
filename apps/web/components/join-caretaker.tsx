'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import styles from './join-caretaker.module.css';
export function JoinCaretaker(){
 const router=useRouter();
 const [token,setToken]=useState('');
 const [busy,setBusy]=useState(false);
 const [authorized,setAuthorized]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  const match=window.location.hash.slice(1);
  if(/^[a-f0-9]{64}$/.test(match))setToken(match);
  // Clear secret from address bar and browser history after reading it.
  if(window.location.hash)window.history.replaceState(null,'',window.location.pathname);
 },[]);
 async function accept(){
  if(!token||!authorized||busy)return;
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/v1/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,authorized:true}),cache:'no-store',referrerPolicy:'no-referrer'});
   const data=await res.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!res.ok)throw new Error(data.error||'temporarily_unavailable');
   setToken('');router.replace('/');router.refresh();
  }catch(e){
   const reason=e instanceof Error?e.message:'temporarily_unavailable';
   const notes:Record<string,string>={
    qr_expired_or_used:'This QR is expired or has already been used. Ask your doctor for a fresh invitation.',
    qr_account_already_joined:'This temporary account is already connected to a patient.',
    qr_requires_guest:'Open the QR link in a fresh browser or sign out of your doctor account.',
    anonymous_signin_disabled:'Smriti needs Anonymous Sign-Ins enabled in Supabase before QR onboarding can work.',
    not_configured:'Smriti account setup is unavailable. Contact the doctor.',
    invalid_request:'This QR link is invalid.',
    forbidden:'The QR invitation cannot be accepted.',
   };
   setError(notes[reason]||'Could not activate your account. Ask your doctor for a new QR code.');
  }finally{setBusy(false);}
 }
 return <section className={styles.shell}>
  <span className={styles.kicker}>SMRITI · CARETAKER INVITATION</span>
  <h1>Welcome to Smriti</h1>
  <p>Your doctor has created a fictional care profile. Join it to speak with Smriti, add memories and track daily observations.</p>
  {!token?<div role="alert" className={styles.error}>No usable QR invitation found. Ask the doctor to share a fresh QR or link.</div>
  :<div className={styles.inner}>
   <div className={styles.icon} aria-hidden="true">♡</div>
   <h2>Activate your caretaker account</h2>
   <p>Continue without an email or password. This is a one-time claim and cannot be reused. Set up recovery details from the profile icon afterwards.</p>
   <label className={styles.agree}><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/>
    <span>I am authorized to manage this <strong>fictional test</strong> patient profile.</span>
   </label>
   <button type="button" className={styles.primary} onClick={()=>void accept()} disabled={!authorized||busy}>{busy?'Connecting…':'Join care profile'}</button>
  </div>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <p className={styles.note}>This QR should be scanned only by the intended caretaker. Real patient data is not supported in this prototype.</p>
  <Link href="/login">Back to doctor sign in</Link>
 </section>;
}
