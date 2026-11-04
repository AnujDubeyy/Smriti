'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

const errors:Record<string,string>={
 sign_in_failed:'Email or password is incorrect. If you just signed up, confirm your email before signing in.',
 email_not_confirmed:'Your account exists, but your email is not confirmed. Check your inbox for the confirmation link.',
 email_rate_limited:'Supabase has reached its email-sending limit. Signup emails cannot be sent right now. Please try later or contact the Smriti administrator to configure email delivery.',
 auth_rate_limited:'Too many sign-in attempts. Please wait before trying again.',
 email_delivery_restricted:'Email delivery is restricted to authorized addresses until Smriti configures a custom SMTP sender.',
 signup_disabled:'New account registration is currently disabled.',
 signup_unavailable:'Email signup is temporarily unavailable. Please contact the Smriti administrator.',
 weak_password:'Choose a stronger password with at least 12 characters.',
 sign_up_failed:'Account creation was rejected. Please check your details or contact the Smriti administrator.',
 not_configured:'Smriti account services are not configured yet.',
 invalid_request:'Check your email and password. Passwords must be at least 12 characters.',
 forbidden:'Please refresh the page and try again.',
 temporarily_unavailable:'Smriti could not read the authentication server response. Please try again later.',
 server_unavailable:'Smriti is having trouble connecting to the authentication server.'
};
export function AuthForm({mode,configured}:{mode:'login'|'signup';configured:boolean}){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [confirmation,setConfirmation]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
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
   if(mode==='signup'){if(result.confirmationRequired===false){router.replace('/');router.refresh();return;}setConfirmation(true);return;}
   router.replace('/');router.refresh();
  }catch(e){
   const code=e instanceof Error?e.message:'temporarily_unavailable';
   setError(errors[code]||'The authentication request failed. Please check your connection and try again later.');
  }finally{setBusy(false);}
 }
 return <section className="smriti-auth-layout">
  <div className="smriti-auth-heading">
   <span className="smriti-auth-kicker">SMRITI</span>
   <h1>{mode==='login'?'Welcome back':'Create your account'}</h1>
   <p>{mode==='login'?'Sign in to continue to your care workspace.'
    :'One account for either Doctor or Patient & Caregiver. You will choose your role and complete setup after signing in.'}</p>
  </div>
  {confirmation?<div className="smriti-auth-confirmation" role="status">
   <h2>Check your email</h2><p>We sent a confirmation link to your address. Open it, then sign in to finish your Smriti setup.</p>
   <Link className="smriti-auth-primaryLink" href="/login">Go to sign in</Link>
  </div>:<form className="smriti-auth-form" onSubmit={submit} aria-busy={busy}>
   <label>Email address<input type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="you@example.com" /></label>
   <label>Password<input type="password" name="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} required placeholder="Enter your password"/></label>
   {mode==='signup'?<p className="smriti-auth-hint">Use at least 12 characters.</p>:null}
   {!configured?<p className="smriti-auth-error" role="alert">Account setup is temporarily unavailable. Please try the main Smriti site.</p>:null}
   {error?<p className="smriti-auth-error" role="alert">{error}</p>:null}
   <button className="smriti-auth-primary" type="submit" disabled={!configured||busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button>
  </form>}
  <div className="smriti-auth-links">
   {mode==='login'?<><span>New to Smriti? <Link href="/signup">Create an account</Link></span><Link href="/recover">Forgot password?</Link></>
   :<span>Already have an account? <Link href="/login">Sign in</Link></span>}
  </div>
  <p className="smriti-auth-footnote">After signing in, choose <strong>Doctor</strong> or <strong>Patient & Caregiver</strong>. Patient information is shared only through authorized care connections.</p>
 </section>;
}
