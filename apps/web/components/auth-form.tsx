'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {usePreferences} from '../app/preferences';
import {authMessages} from '../lib/auth/messages';
export function AuthForm({mode,configured}:{mode:'login'|'signup';configured:boolean}){
 const router=useRouter();const {locale}=usePreferences();const t=authMessages[locale];
 const [status,setStatus]=useState<'idle'|'busy'|'error'|'confirmation'>('idle');
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!configured||status==='busy')return;
  const form=event.currentTarget;const values=new FormData(form);setStatus('busy');
  try{
   const response=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:values.get('email'),password:values.get('password')}),cache:'no-store'});
   if(!response.ok){setStatus('error');return;}
   form.reset();if(mode==='signup')setStatus('confirmation');else {router.replace('/');router.refresh();}
  }catch{setStatus('error');}
 }
 return <section className="auth-panel"><p className="eyebrow">{t.account}</p><h1 tabIndex={-1}>{t[mode]}</h1><p>One account for the patient’s care and Doctor Monitoring. Complete your details after your first sign-in.</p>
 {!configured?<p role="status" className="offline-notice">{t.unavailable}</p>:null}
 <form onSubmit={submit} className="auth-form" aria-busy={status==='busy'}>
 <label className="field">{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={!configured}/></label>
 <label className="field">{t.password}<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} aria-describedby="password-hint" required disabled={!configured}/></label>
 <p id="password-hint">{t.passwordHint}</p><button className="button" disabled={!configured||status==='busy'||status==='confirmation'}>{status==='busy'?t.busy:t.submit}</button>
 </form><p role="status" aria-live="polite">{status==='error'?t.error:status==='confirmation'?t.confirm:''}</p>
 <div className="actions"><Link href={mode==='login'?'/signup':'/login'}>{mode==='login'?t.signup:t.login}</Link><Link href="/recover">Forgot password?</Link></div></section>;
}
