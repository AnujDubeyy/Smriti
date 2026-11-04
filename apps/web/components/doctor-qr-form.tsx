'use client';
import {useState} from 'react';
import {InvitationQr} from './invitation-qr';
import styles from './doctor-qr-form.module.css';
type Data={patient_name:string;caretaker_name:string;relationship:string;date_of_birth:string;sex:string;family_count:string;locale:string;support_notes:string};
const defaults:Data={patient_name:'',caretaker_name:'',relationship:'',date_of_birth:'',sex:'prefer_not_to_say',family_count:'',locale:'hi-IN',support_notes:''};
export function DoctorQrForm(){
 const [data,setData]=useState<Data>(defaults);
 const [url,setUrl]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [profile,setProfile]=useState('');
 const set=(field:keyof Data,value:string)=>setData(v=>({...v,[field]:value}));
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/v1/care/doctor-qr',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...data,family_count:Number(data.family_count)}),cache:'no-store'});
   const result=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(result.error||'temporarily_unavailable');
   setUrl(result.url);setProfile(data.patient_name);
   setData(defaults);
  }catch(e){
   const code=e instanceof Error?e.message:'';
   const errs:Record<string,string>={doctor_only:'Only signed-in doctor accounts can create a profile.',patient_limit:'You have too many unclaimed invitations.',invalid_birth_date:'Check the date of birth.',invalid_request:'Check the entered details.',temporarily_unavailable:'Could not save the profile. Please try again.'};
   setError(errs[code]||'Unable to create the profile. Check your connection and try again.');
  }finally{setBusy(false);}
 }
 async function share(){
  try{
   if(navigator.share){await navigator.share({title:'Join Smriti caretaker profile',text:'Your one-time caretaker invitation for '+profile,url});return;}
   await navigator.clipboard.writeText(url);
  }catch{/* Dismissed share sheet; copying remains available. */}
 }
 function saveQr(){
  const el=document.getElementById('smriti-invitation-qr');if(!el)return;
  const data=new XMLSerializer().serializeToString(el);
  const blob=new Blob([data],{type:'image/svg+xml'});
  const href=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=href;anchor.download='smriti-caretaker-qr.svg';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
 }
 if(url)return <section className={styles.ready}>
  <span className={styles.eyebrow}>PROFILE CREATED</span>
  <h2>{profile}</h2><p>Share this invitation with the caretaker. They can scan it, accept the profile and enter Smriti without an email or password.</p>
  <div className={styles.qr}><InvitationQr value={url}/></div>
  <p className={styles.hint}>One use only · Expires in 48 hours · Anyone with this QR can claim this fictional test profile until it is used.</p>
  <div className={styles.actions}>
   <button type="button" onClick={()=>void share()}>Share invitation</button>
   <button type="button" onClick={()=>void navigator.clipboard.writeText(url)}>Copy link</button>
   <button type="button" onClick={saveQr}>Save QR</button>
  </div>
  <button type="button" className={styles.secondary} onClick={()=>{setUrl('');setProfile('');}}>Create another profile</button>
 </section>;
 return <section className={styles.wrap}>
  <div className={styles.heading}><span className={styles.eyebrow}>DOCTOR · NEW CARE PROFILE</span>
   <h2>Create caretaker and patient profile</h2><p>Enter the essentials. The caretaker can complete the fictional patient profile after scanning the QR.</p></div>
  <form onSubmit={create} className={styles.form}>
   <label>Caretaker name<input required minLength={2} maxLength={120} value={data.caretaker_name} onChange={e=>set('caretaker_name',e.target.value)} placeholder="Name of caretaker"/></label>
   <label>Relationship to patient<input required minLength={2} maxLength={100} value={data.relationship} onChange={e=>set('relationship',e.target.value)} placeholder="e.g. Daughter, spouse"/></label>
   <label>Patient name<input required minLength={2} maxLength={120} value={data.patient_name} onChange={e=>set('patient_name',e.target.value)} placeholder="Preferred name"/></label>
   <div className={styles.grid}>
    <label>Date of birth<input required type="date" value={data.date_of_birth} max={new Date().toISOString().slice(0,10)} onChange={e=>set('date_of_birth',e.target.value)}/></label>
    <label>Family members<input required type="number" min={0} max={50} value={data.family_count} onChange={e=>set('family_count',e.target.value)}/></label>
    <label>Sex<select value={data.sex} onChange={e=>set('sex',e.target.value)}>
     <option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option>
    </select></label>
    <label>Preferred language<select value={data.locale} onChange={e=>set('locale',e.target.value)}>
     <option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="mr-IN">मराठी</option>
    </select></label>
   </div>
   <label>Helpful notes (optional)<textarea maxLength={2000} rows={3} value={data.support_notes} onChange={e=>set('support_notes',e.target.value)} placeholder="Additional details can be added later by the caretaker"/></label>
   <p className={styles.notice}>Only fictional test profiles can be created here. The QR is a one-time claim, not the patient's database ID. Doctor access to records requires the caretaker's explicit sharing permission.</p>
   {error&&<div role="alert" className={styles.error}>{error}</div>}
   <button type="submit" disabled={busy} className={styles.submit}>{busy?'Creating…':'Create profile & QR code'}</button>
  </form>
 </section>;
}
