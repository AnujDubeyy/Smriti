'use client';
import {DayFirstDate} from './day-first-date';
import {useState} from 'react';
import Link from 'next/link';
import styles from './profile-editor.module.css';
import {relationshipOptions} from '../lib/clinical-intake';
type Details={patient_name:string;caretaker_name:string;relationship:string;relationship_other:string;date_of_birth:string;sex:string;family_count:number;support_notes:string};
export function ProfileEditor({patientId,initial,email,isAnonymous,role,hasPassword=role==='doctor',pendingEmail}:{
 hasPassword?:boolean;pendingEmail?:string;patientId?:string;initial?:Details;email?:string;isAnonymous:boolean;role:'doctor'|'caregiver'
}){
 const [details,setDetails]=useState<Details|null>(initial||null);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [emailValue,setEmailValue]=useState(pendingEmail||email||'');
 const [password,setPassword]=useState('');
 const [accountBusy,setAccountBusy]=useState(false);
 const [accountMsg,setAccountMsg]=useState('');
 const [accountErr,setAccountErr]=useState('');
 const [requested,setRequested]=useState(pendingEmail||'');
 const [passwordSet,setPasswordSet]=useState(hasPassword);
 const [editPassword,setEditPassword]=useState(!hasPassword);
 const set=(key:keyof Details,value:string|number)=>setDetails(old=>old?{...old,[key]:value}:old);
 async function updateDetails(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!patientId||!details||saving)return;
  setSaving(true);setMessage('');setError('');
  try{
   const res=await fetch('/api/v1/care/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patient_id:patientId,...details}),cache:'no-store'});
   const body=await res.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!res.ok)throw new Error(body.error||'temporarily_unavailable');
   setMessage('Patient details saved.');
  }catch{setError('Could not save changes. Check your details and try again.');}
  finally{setSaving(false);}
 }
 async function updateCredentials(action:'email'|'password'|'resend'){
  if(accountBusy)return;setAccountBusy(true);setAccountErr('');setAccountMsg('');
  try{
   const res=await fetch('/api/v1/profile/credentials',{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(action==='password'?{password}:{email:emailValue,...(action==='resend'?{resend:true}:{})}),cache:'no-store'});
   const body=await res.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!res.ok)throw new Error(body.error||'temporarily_unavailable');
   setAccountMsg(action!=='password'
    ?'Email update requested. Check your inbox for the verification link before setting a password.'
    :'Password updated. You can use this email and password when returning to Smriti.');
   if(action==='password'){setPassword('');setPasswordSet(true);setEditPassword(false);}else setRequested(emailValue);
   window.dispatchEvent(new Event('smriti-account-updated'));
  }catch(e){
   const reason=e instanceof Error?e.message:'';
   setAccountErr(reason==='verify_email_first'
    ?'Add and verify your email before setting a password.'
    :reason==='email_rate_limited'?'Too many requests. Wait before requesting another email.':reason==='email_delivery_unavailable'?'The email service could not send a verification link. Contact the Smriti administrator.':'Could not update your account. Check your details and try again.');
  }finally{setAccountBusy(false);}
 }
 return <section className={styles.root}>
  <header><span className={styles.kicker}>MY PROFILE</span><h1>Profile & account</h1>
   <p>Manage your Smriti login and connected fictional care information.</p></header>
  <section className={styles.card} id="login-details">
   <h2>Login details</h2>
   {isAnonymous?<p className={styles.notice}>Keep this browser signed in until you verify your email and set a password.</p>:null}
   <form className={styles.form} onSubmit={e=>{e.preventDefault();void updateCredentials(requested===emailValue?'resend':'email');}}>
    <label>Email address<input type="email" required maxLength={254} value={emailValue} onChange={e=>setEmailValue(e.target.value)} autoComplete="email"/></label>
    <button disabled={accountBusy||!emailValue||emailValue===email}>{requested===emailValue&&requested?'Resend verification email':email?'Change email':'Verify email'}</button>
   </form>
   {passwordSet&&!editPassword?<button type="button" onClick={()=>setEditPassword(true)}>Edit password</button>:<form className={styles.form} onSubmit={e=>{e.preventDefault();void updateCredentials('password');}}>
    <label>New password<input required type="password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 12 characters" autoComplete="new-password"/></label>
    <button disabled={accountBusy||password.length<12||isAnonymous}>{passwordSet?'Save password':'Set password'}</button>
   </form>}
   {accountMsg&&<p className={styles.success} role="status">{accountMsg}</p>}
   {accountErr&&<p className={styles.error} role="alert">{accountErr}</p>}
   <p className={styles.hint}>Email verification may still be required by Supabase when converting a temporary QR session to a recoverable account. This protects account ownership.</p>
  </section>
  {role==='caregiver'&&patientId&&details?<section className={styles.card}>
   <h2>Care profile</h2>
   <p>Patient details can be updated here. Personal stories and daily observations are managed in their own sections.</p>
   <form onSubmit={updateDetails} className={styles.form}>
    <label>Caretaker name<input required value={details.caretaker_name} onChange={e=>set('caretaker_name',e.target.value)}/></label>
    <label>Relationship to patient
     <select value={details.relationship} required
      onChange={e=>setDetails(previous=>previous?{...previous,
       relationship:e.target.value,
       relationship_other:e.target.value==='other'?previous.relationship_other:''
      }:previous)}
      aria-label="Relationship to patient">
      {relationshipOptions.filter(([id])=>id!=='no_blood_relation'||details.relationship===id).map(([id,label])=><option key={id} value={id}>{label}</option>)}
     </select>
    </label>
    {details.relationship==='other'?<label>Specify relationship
     <input required minLength={2} maxLength={100} autoComplete="off"
      placeholder="e.g. Family friend"
      value={details.relationship_other}
      onChange={e=>set('relationship_other',e.target.value)}/>
    </label>:null}
    <label>Patient name<input required value={details.patient_name} onChange={e=>set('patient_name',e.target.value)}/></label>
    <div className={styles.two}>
     <label>Date of birth<DayFirstDate required value={details.date_of_birth} onChange={v=>set('date_of_birth',v)}/></label>
     <label>Family members<input required min={0} max={50} type="number" value={details.family_count} onChange={e=>set('family_count',Number(e.target.value))}/></label>
    </div>
    <label>Sex<select value={details.sex} onChange={e=>set('sex',e.target.value)}>
     <option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option>
    </select></label>
    <label>Support notes<textarea rows={4} maxLength={2000} value={details.support_notes} onChange={e=>set('support_notes',e.target.value)} placeholder="Add any helpful context"/></label>
    {message&&<p className={styles.success} role="status">{message}</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <button disabled={saving} type="submit">{saving?'Saving…':'Save patient profile'}</button>
   </form>
   <div className={styles.links}>
    <Link href={'/permissions?patient='+patientId}>Manage voice and doctor-sharing permissions</Link>
    <Link href="/companionship">Talk to Smriti</Link>
    <Link href="/monitoring">Daily observations</Link>
   </div>
  </section>:null}

 </section>;
}
