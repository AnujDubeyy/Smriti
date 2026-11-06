'use client';
import {DayFirstDate} from './day-first-date';
import {useState} from 'react';
import {InvitationQr} from './invitation-qr';
import {
 relationshipOptions,diagnosisOptions,dementiaDiagnoses,bloodGroups,severityOptions,supportOptions,
 communicationOptions,type DoctorIntake
} from '../lib/clinical-intake';
import styles from './doctor-qr-form.module.css';

const defaults:DoctorIntake={
 patient_name:'',caretaker_name:'',relationship:'daughter',relationship_other:'',
 date_of_birth:'',sex:'prefer_not_to_say',family_count:0,locale:'en-IN',
 blood_group:'unknown',diagnoses:['under_evaluation'],diagnosis_status:'under_evaluation',
 dementia_stage:'not_assessed',daily_support:'unknown',communication_support:[],other_condition:''
};
type Scalar=Exclude<keyof DoctorIntake,'diagnoses'|'communication_support'>;
export function DoctorQrForm({existingCount=0}:{existingCount?:number}){
 const [data,setData]=useState<DoctorIntake>(defaults);
 const [expanded,setExpanded]=useState(existingCount===0);
 const [url,setUrl]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [profile,setProfile]=useState('');
 const set=(field:Scalar,value:string|number)=>setData(v=>({...v,[field]:value}));
 const hasDementia=data.diagnosis_status==='confirmed_by_clinician'&&
  data.diagnoses.some(x=>(dementiaDiagnoses as readonly string[]).includes(x));
 function toggleDiagnosis(id:string){
  setData(v=>{
   const current=v.diagnoses||[];
   const next=current.includes(id)?current.filter(x=>x!==id)
    :id==='under_evaluation'?['under_evaluation']:[...current.filter(x=>x!=='under_evaluation'),id];
   const dementia=next.some(x=>(dementiaDiagnoses as readonly string[]).includes(x));
   return {...v,diagnoses:next.length?next:['under_evaluation'],
    dementia_stage:dementia&&v.diagnosis_status==='confirmed_by_clinician'?v.dementia_stage:'not_assessed'};
  });
 }
 function toggleSupport(id:string){
  setData(v=>({...v,communication_support:(v.communication_support||[]).includes(id)
   ?(v.communication_support||[]).filter(x=>x!==id):[...(v.communication_support||[]),id]}));
 }
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/v1/care/doctor-qr',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data),cache:'no-store'});
   const result=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(result.error||'temporarily_unavailable');
   setUrl(result.url);setProfile(data.patient_name);setData(defaults);
  }catch(e){
   const code=e instanceof Error?e.message:'';
   const errs:Record<string,string>={
    doctor_only:'Only a signed-in doctor account can create a profile.',
    patient_limit:'Maximum pending invitations reached.',
    invalid_birth_date:'Check the date of birth.',
    invalid_request:'Check the selected diagnosis, stage and other details.',
    temporarily_unavailable:'Unable to save. Try again.'
   };
   setError(errs[code]||'Unable to create the profile. Please check your connection.');
  }finally{setBusy(false);}
 }
 async function share(){
  try{
   if(navigator.share){await navigator.share({title:'Join Smriti caretaker profile',url});return;}
   await navigator.clipboard.writeText(url);
  }catch{/* user dismissed share */}
 }
 function saveQr(){
  const el=document.getElementById('smriti-invitation-qr');if(!el)return;
  const xml=new XMLSerializer().serializeToString(el);
  const blob=new Blob([xml],{type:'image/svg+xml'});
  const href=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=href;anchor.download='smriti-caretaker-qr.svg';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
 }
 if(url)return <section className={styles.ready}>
  <span className={styles.eyebrow}>PROFILE CREATED</span>
  <h2>{profile}</h2>
  <p>Share this one-time QR with the intended caretaker.</p>
  <div className={styles.qr}><InvitationQr value={url}/></div>
  <p className={styles.hint}>Single-use invitation. Expires after 48 hours. Treat the QR as a private sign-in link.</p>
  <div className={styles.actions}>
   <button type="button" onClick={()=>void share()}>Share invitation</button>
   <button type="button" onClick={()=>void navigator.clipboard.writeText(url)}>Copy link</button>
   <button type="button" onClick={saveQr}>Save QR</button>
  </div>
  <button className={styles.secondary} onClick={()=>{setUrl('');setExpanded(false);window.location.reload();}}>Back to patients</button>
 </section>;
 if(!expanded)return <section className={styles.compact}>
  <div><span className={styles.eyebrow}>NEW PATIENT</span>
   <h2>Add another caretaker & patient</h2>
   <p>Your existing profile remains connected. Create another only when needed.</p>
  </div>
  <button type="button" onClick={()=>setExpanded(true)}>+ New profile</button>
 </section>;
 return <section className={styles.wrap}>
  <div className={styles.heading}><span className={styles.eyebrow}>DOCTOR · CLINICAL INTAKE</span>
   <h2>Create caretaker and patient profile</h2>
   <p>Record the essentials before sharing a QR. These are clinician-entered fictional test details, not an automatic diagnosis.</p>
   {existingCount>0?<button type="button" className={styles.secondary} onClick={()=>setExpanded(false)}>Close form</button>:null}
  </div>
  <form onSubmit={create} className={styles.form}>
   <fieldset className={styles.fieldset}>
    <legend>1. Caretaker & relationship</legend>
    <label>Caretaker name<input required minLength={2} maxLength={120} value={data.caretaker_name} onChange={e=>set('caretaker_name',e.target.value)} placeholder="Caretaker name"/></label>
    <label>Relationship to patient<select value={data.relationship} onChange={e=>set('relationship',e.target.value)}>
     {relationshipOptions.filter(([id])=>id!=='no_blood_relation').map(([id,label])=><option key={id} value={id}>{id==='other'?'Other (please specify)':label}</option>)}
    </select></label>
    {data.relationship==='other'?<label>Specify relationship<input required maxLength={100} value={data.relationship_other} onChange={e=>set('relationship_other',e.target.value)} placeholder="Describe the relationship"/></label>:null}
   </fieldset>
   <fieldset className={styles.fieldset}>
    <legend>2. Patient details</legend>
    <label>Patient name<input required minLength={2} maxLength={120} value={data.patient_name} onChange={e=>set('patient_name',e.target.value)} placeholder="Patient preferred name"/></label>
    <div className={styles.grid}>
     <label>Date of birth<DayFirstDate required value={data.date_of_birth} max={new Date().toISOString().slice(0,10)} onChange={v=>set('date_of_birth',v)}/></label>
     <label>Family members<input required type="number" min={0} max={50} value={data.family_count??0} onChange={e=>set('family_count',Number(e.target.value))}/></label>
     <label>Sex<select value={data.sex} onChange={e=>set('sex',e.target.value)}>
      <option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option></select></label>
     <label>Blood group <small>(optional; unknown is fine)</small><select value={data.blood_group||'unknown'} onChange={e=>set('blood_group',e.target.value)}>
      {bloodGroups.map(id=><option key={id} value={id}>{id==='unknown'?'Unknown / not recorded':id}</option>)}
     </select></label>
     <label>Conversation language<select value={data.locale} onChange={e=>set('locale',e.target.value)}>
      <option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="mr-IN">मराठी</option>
     </select></label>
    </div>
   </fieldset>
   <fieldset className={styles.fieldset}>
    <legend>3. Clinical condition</legend>
    <p className={styles.help}>Select all conditions recorded by the clinician. MCI is distinct from diagnosed dementia, and Parkinson’s disease alone does not imply dementia.</p>
    <div className={styles.diagnosisGrid}>
     {diagnosisOptions.map(([id,label])=><label className={styles.checkCard} key={id}>
      <input type="checkbox" checked={(data.diagnoses||[]).includes(id)} onChange={()=>toggleDiagnosis(id)}/>
      <span>{label}</span>
     </label>)}
    </div>
    {data.diagnoses?.includes('other')?<label>Other condition<input required maxLength={150} value={data.other_condition||''} onChange={e=>set('other_condition',e.target.value)} placeholder="Clinician-described condition"/></label>:null}
    <label>Diagnosis certainty<select value={data.diagnosis_status} onChange={e=>setData(v=>({...v,
     diagnosis_status:e.target.value as NonNullable<DoctorIntake['diagnosis_status']>,dementia_stage:e.target.value==='confirmed_by_clinician'?v.dementia_stage:'not_assessed'}))}>
     <option value="under_evaluation">Under evaluation / provisional</option>
     <option value="confirmed_by_clinician">Clinician-documented diagnosis</option>
     <option value="unknown">Not known</option>
    </select></label>
    {hasDementia?<label>Dementia severity <small>(clinician-reported, not calculated by Smriti)</small>
     <select value={data.dementia_stage||'not_assessed'} onChange={e=>set('dementia_stage',e.target.value)}>
      {severityOptions.map(([id,label])=><option value={id} key={id}>{label}</option>)}
     </select></label>:<p className={styles.help}>Dementia staging will only appear when a dementia diagnosis is selected and marked clinician-documented.</p>}
   </fieldset>
   <fieldset className={styles.fieldset}>
    <legend>4. Daily support & communication</legend>
    <label>Everyday assistance<select value={data.daily_support} onChange={e=>set('daily_support',e.target.value)}>
     {supportOptions.map(([id,label])=><option value={id} key={id}>{label}</option>)}
    </select></label>
    <span className={styles.fieldLabel}>Communication accommodations <small>(select any that help)</small></span>
    <div className={styles.diagnosisGrid}>
     {communicationOptions.map(([id,label])=><label className={styles.checkCard} key={id}>
      <input type="checkbox" checked={(data.communication_support||[]).includes(id)} onChange={()=>toggleSupport(id)}/>
      <span>{label}</span>
     </label>)}
    </div>
   </fieldset>

   {error?<p role="alert" className={styles.error}>{error}</p>:null}
   <button type="submit" disabled={busy} className={styles.submit}>{busy?'Creating…':'Create patient & QR invitation'}</button>
  </form>
 </section>;
}
