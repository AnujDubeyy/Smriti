'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from './auth-form.module.css';

const errors:Record<string,string>={
 sign_in_failed:'Email or password is incorrect, or the email is not confirmed.',
 sign_up_failed:'Account creation failed. Check your email or try another address.',
 not_configured:'Smriti account services are not configured yet.',
 invalid_request:'Check your email and password. Passwords must be at least 12 characters.',
 forbidden:'Please refresh the page and try again.'
};
export function AuthForm({mode,configured}:{mode:'login'|'signup';configured:boolean}){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [confirmation,setConfirmation]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!configured||busy)return;
  const form=event.currentTarget;
  const values=new FormData(form);
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/auth/'+mode,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:values.get('email'),password:values.get('password')}),
    cache:'no-store'
   });
   const result=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(result.error||'temporarily_unavailable');
   if(mode==='signup'){setConfirmation(true);return;}
   router.replace('/');router.refresh();
  }catch(e){
   const code=e instanceof Error?e.message:'temporarily_unavailable';
   setError(errors[code]||'Could not continue. Try again.');
  }finally{setBusy(false);}
 }
 return <section className={styles.layout}>
  <div className={styles.heading}>
   <span className={styles.kicker}>SMRITI</span>
   <h1>{mode==='login'?'Welcome back':'Create your account'}</h1>
   <p>{mode==='login'?'Sign in to continue to your care workspace.'
    :'One account for either Doctor or Patient & Caregiver. You will choose your role and complete setup after signing in.'}</p>
  </div>
  {confirmation?<div className={styles.confirmation} role="status">
   <h2>Check your email</h2><p>We sent a confirmation link to your address. Open it, then sign in to finish your Smriti setup.</p>
   <Link className={styles.primaryLink} href="/login">Go to sign in</Link>
  </div>:<form className={styles.form} onSubmit={submit} aria-busy={busy}>
   <label>Email address<input type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="you@example.com" disabled={!configured}/></label>
   <label>Password<input type="password" name="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} required disabled={!configured} placeholder="Enter your password"/></label>
   {mode==='signup'?<p className={styles.hint}>Use at least 12 characters.</p>:null}
   {!configured?<p className={styles.error} role="alert">Account services are not available. Check the Smriti Supabase settings.</p>:null}
   {error?<p className={styles.error} role="alert">{error}</p>:null}
   <button className={styles.primary} type="submit" disabled={!configured||busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button>
  </form>}
  <div className={styles.links}>
   {mode==='login'?<><span>New to Smriti? <Link href="/signup">Create an account</Link></span><Link href="/recover">Forgot password?</Link></>
   :<span>Already have an account? <Link href="/login">Sign in</Link></span>}
  </div>
  <p className={styles.footnote}>After signing in, choose <strong>Doctor</strong> or <strong>Patient & Caregiver</strong>. Clinical access requires independent approval.</p>
 </section>;
}
