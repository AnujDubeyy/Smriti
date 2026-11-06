'use client';
import {useState} from 'react';
import {
 bloodGroups,diagnosisOptions,dementiaDiagnoses,severityOptions,supportOptions,
 communicationOptions
} from '../lib/clinical-intake';
import styles from './doctor-intake-editor.module.css';
type Medical={
 blood_group:string;diagnoses:string[];diagnosis_status:string;dementia_stage:string;
 daily_support:string;communication_support:string[];other_condition:string;
};
const base:Medical={
 blood_group:'unknown',diagnoses:['under_evaluation'],diagnosis_status:'under_evaluation',
 dementia_stage:'not_assessed',daily_support:'unknown',communication_support:[],other_condition:''
};
export function DoctorIntakeEditor({patientId,initial,preview=false}:{
 patientId:string;initial:Partial<Medical>|null;preview?:boolean
}){
 const [data,setData]=useState<Medical>({...base,...initial,
  diagnoses:initial?.diagnoses?.length?initial.diagnoses:['under_evaluation'],
  communication_support:initial?.communication_support||[]});
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [hasIntake,setHasIntake]=useState(!!initial?.diagnoses?.length);
 function toggleEditor(){
  if(preview&&!open){
   try{
    const saved=sessionStorage.getItem('smriti-demo-intake:'+patientId);
    if(saved){setData(JSON.parse(saved));setHasIntake(true);}
   }catch{/* The preview also works without browser storage. */}
  }
  setOpen(value=>!value);
 }
 const dementia=data.diagnosis_status==='confirmed_by_clinician'&&
  data.diagnoses.some(x=>(dementiaDiagnoses as readonly string[]).includes(x));
 const set=(key:keyof Medical,value:string|string[])=>setData(v=>({...v,[key]:value}));
 function toggleDiagnosis(id:string){
  setData(v=>{
   const d=v.diagnoses.includes(id)?v.diagnoses.filter(x=>x!==id)
    :id==='under_evaluation'?['under_evaluation']:[...v.diagnoses.filter(x=>x!=='under_evaluation'),id];
   const selections=d.length?d:['under_evaluation'];
   const permitted=selections.some(x=>(dementiaDiagnoses as readonly string[]).includes(x))&&v.diagnosis_status==='confirmed_by_clinician';
   return {...v,diagnoses:selections,dementia_stage:permitted?v.dementia_stage:'not_assessed'};
  });
 }
 function toggleSupport(id:string){set('communication_support',data.communication_support.includes(id)
  ?data.communication_support.filter(x=>x!==id):[...data.communication_support,id]);}
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
  try{
   if(preview){
    sessionStorage.setItem('smriti-demo-intake:'+patientId,JSON.stringify(data));
    setHasIntake(true);setMessage('Demo clinical intake saved in this tab.');return;
   }
   const r=await fetch('/api/v1/care/doctor-intake',{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patient_id:patientId,clinical_intake:data}),cache:'no-store'});
   const j=await r.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!r.ok)throw new Error(j.error||'temporarily_unavailable');
   setHasIntake(true);setMessage('Clinical intake saved for this existing patient.');
  }catch(e){const reason=e instanceof Error?e.message:'';
   setError(reason==='forbidden'?'This doctor no longer has authority to edit the intake.':'Could not save. Check the selected diagnosis and stage.');
  }finally{setBusy(false);}
 }
 return <div className={styles.editor}>
  <button type="button" className={styles.toggle} onClick={toggleEditor}
   aria-controls={'intake-'+patientId} aria-expanded={open}><b>{open?'Close clinical intake':hasIntake?'Edit clinical intake':'Complete clinical intake'}</b><span aria-hidden="true">{open?'−':'+'}</span></button>
  {open?<form id={'intake-'+patientId} onSubmit={save} className={styles.form}>
   <p className={styles.help}>Update clinician-entered details without creating another patient or QR. Fictional test data only.</p>
   <label>Blood group<select value={data.blood_group} onChange={e=>set('blood_group',e.target.value)}>
    {bloodGroups.map(x=><option key={x} value={x}>{x==='unknown'?'Unknown / not recorded':x}</option>)}
   </select></label>
   <span className={styles.label}>Recorded diagnoses</span>
   <div className={styles.checks}>
    {diagnosisOptions.map(([id,name])=><label key={id} className={styles.check}>
     <input type="checkbox" checked={data.diagnoses.includes(id)} onChange={()=>toggleDiagnosis(id)}/><span>{name}</span>
    </label>)}
   </div>
   {data.diagnoses.includes('other')?<label>Other condition<input required value={data.other_condition}
    onChange={e=>set('other_condition',e.target.value)} maxLength={150}/></label>:null}
   <label>Diagnosis certainty<select value={data.diagnosis_status} onChange={e=>setData(v=>({...v,
    diagnosis_status:e.target.value,dementia_stage:e.target.value==='confirmed_by_clinician'?v.dementia_stage:'not_assessed'}))}>
    <option value="under_evaluation">Under evaluation</option>
    <option value="confirmed_by_clinician">Clinician-documented</option>
    <option value="unknown">Unknown</option>
   </select></label>
   {dementia?<label>Dementia severity (clinician-entered)<select value={data.dementia_stage} onChange={e=>set('dementia_stage',e.target.value)}>
    {severityOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}
   </select></label>:null}
   <label>Daily assistance<select value={data.daily_support} onChange={e=>set('daily_support',e.target.value)}>
    {supportOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}
   </select></label>
   <span className={styles.label}>Communication support</span>
   <div className={styles.checks}>
    {communicationOptions.map(([id,name])=><label key={id} className={styles.check}>
     <input type="checkbox" checked={data.communication_support.includes(id)} onChange={()=>toggleSupport(id)}/><span>{name}</span>
    </label>)}
   </div>
   {error?<p className={styles.error} role="alert">{error}</p>:null}
   {message?<p className={styles.success} role="status">{message}</p>:null}
   <button type="submit" className={styles.save} disabled={busy}>{busy?'Saving…':'Save clinical intake'}</button>
  </form>:null}
 </div>;
}
