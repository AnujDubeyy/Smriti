'use client';
import {DayFirstDate,displayDate} from './day-first-date';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useDemoCare,updateDemoCare,demoId} from '../lib/demo-care-store';
import {activityCatalog,type Assignment,type ActivityCode} from '../lib/assessment-activities';
import {AssessmentResult} from './assessment-result';
import styles from './doctor-assessments.module.css';
type Patient={patient_id:string;patient_name:string;caretaker_name:string;status:string;sharing_enabled:boolean};
export function DoctorAssessmentManager({patients,initialPatient,localPreview=false}:{patients:Patient[];initialPatient?:string;localPreview?:boolean}){
 const [selected,setSelected]=useState(initialPatient&&patients.some(p=>p.patient_id===initialPatient)?initialPatient:patients[0]?.patient_id||'');
 const demo=useDemoCare();
 const [liveAssignments,setAssignments]=useState<Assignment[]>([]);
 const assignments=localPreview?demo.assignments:liveAssignments;
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [dueDate,setDueDate]=useState('');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const current=patients.find(p=>p.patient_id===selected);
 async function load(patientId:string,signal?:AbortSignal){
  const r=await fetch('/api/v1/doctor/assessments?patient_id='+encodeURIComponent(patientId),{cache:'no-store',signal});
  const j=await r.json().catch(()=>({error:'temporarily_unavailable'}));
  if(!r.ok)throw new Error(j.error||'temporarily_unavailable');
  return j.assignments as Assignment[];
 }
 useEffect(()=>{
  if(localPreview)return;
  if(!current?.sharing_enabled||current.status!=='joined'){return;}
  const controller=new AbortController();
  const id=current.patient_id;
  setLoading(true);
  const refresh=()=>load(id,controller.signal).then(r=>{if(!controller.signal.aborted){setAssignments(r);setError('');}}).catch(e=>{
   if(controller.signal.aborted)return;
   setAssignments([]);setError(e instanceof Error&&e.message==='sharing_required'
    ?'The caretaker must enable doctor sharing before assignments can be viewed.'
    :'Unable to load assignments. Try selecting the patient again.');
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  void refresh();
  const onFocus=()=>{if(!document.hidden)void refresh();};
  window.addEventListener('focus',onFocus);
  const interval=setInterval(onFocus,15000);
  return()=>{controller.abort();clearInterval(interval);window.removeEventListener('focus',onFocus);};
 },[selected,current?.sharing_enabled,current?.status,localPreview]);
 async function assign(code:ActivityCode){
  if(!selected||busy||!current?.sharing_enabled)return;
  if(localPreview){
   updateDemoCare(state=>({...state,assignments:[...state.assignments,{id:demoId(),instrument_code:code,status:'assigned',due_date:dueDate||null,created_at:new Date().toISOString()}]}));
   setMessage('Assigned to Ramesh. Open Patient view to see the notification and complete the activity.');return;
  }
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/v1/doctor/assessments',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patient_id:selected,instrument_code:code,due_date:dueDate||null})
   });
   const body=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(body.error||'temporarily_unavailable');
   setAssignments(await load(selected));
   setMessage('Assigned successfully. The activity now appears in the caretaker’s Assessment tab.');
  }catch(e){
   const reason=e instanceof Error?e.message:'temporarily_unavailable';
   const messages:Record<string,string>={
    assessment_already_assigned:'This activity is already assigned and awaiting a response.',
    sharing_required:'The caretaker needs to enable doctor sharing first.',
    invalid_due_date:'Choose a date within the next 180 days.',
    invalid_assessment:'This activity is not supported.',
   };
   setError(messages[reason]||'The activity could not be assigned. Please try again.');
  }finally{setBusy(false);}
 }
 return <section className={styles.root}>
  <div className={styles.head}>
   <span className={styles.eyebrow}>DOCTOR · ASSESSMENTS</span>
   <h1>Assign an assessment</h1>
   <p>Choose a connected patient and an spoken activity. Review the answer and activity count here after the caretaker submits it.</p>
  </div>
  {!patients.length?<div className={styles.card}>
   <h2>No patients yet</h2><p>Create a fictional patient profile and invite the caretaker first.</p>
   <Link href="/doctor" className={styles.link}>Create patient profile</Link>
  </div>:<>
   <div className={styles.card}>
    <label className={styles.label}>Patient
     <select disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setAssignments([]);setError('');setMessage('');}}>
      {patients.map(p=><option key={p.patient_id} value={p.patient_id}>{p.patient_name} · {p.caretaker_name}</option>)}
     </select>
    </label>
    {current?<p className={styles.status}>{current.status!=='joined'
     ?'Waiting for caretaker to claim the QR invitation.'
     :!current.sharing_enabled
     ?'Caretaker connected. Doctor sharing is not enabled yet.'
     :'Caretaker connected · Doctor sharing enabled'}</p>:null}
    {current&&!current.sharing_enabled?<p className={styles.warning}>Ask the caretaker to open Profile → Care permissions → “Share monitoring with connected doctor.” Smriti requires their consent before clinical assignments or records are shared.</p>:null}
    <label className={styles.label}>Due date <span className={styles.optional}>(optional)</span>
     <DayFirstDate value={dueDate} min={new Date().toISOString().slice(0,10)} onChange={setDueDate}/>
    </label>
   </div>
   {current?.sharing_enabled&&current.status==='joined'?<>
    <h2 className={styles.subheading}>Choose an activity</h2>
    <div className={styles.catalog}>
     {activityCatalog.map(activity=>{
      const awaiting=assignments.some(a=>a.instrument_code===activity.code&&(a.status==='assigned'||a.status==='in_progress'));
      return <article key={activity.code} className={styles.activity}>
       <div className={styles.activityTop}><strong>{activity.title}</strong><span>{activity.duration}</span></div>
       <p>{activity.description}</p>
       <button type="button" disabled={busy||loading||awaiting||dueDate==='invalid'}
        onClick={()=>void assign(activity.code)}>{awaiting?'Already assigned':busy?'Assigning…':'Assign to patient'}</button>
      </article>;
     })}
    </div>
    <div className={styles.card}>
     <h2>Assigned activities</h2>
     {loading?<p role="status">Loading…</p>:assignments.length?<ul className={styles.assigned}>
      {assignments.map(a=>{
       const title=activityCatalog.find(item=>item.code===a.instrument_code)?.title||'Activity';
       return <li key={a.id}><strong>{title}</strong><span>{a.status==='submitted'?'Response submitted':a.status==='assigned'?'Awaiting response':a.status}</span>
        {a.due_date?<small>Due {displayDate(a.due_date)}</small>:null}<AssessmentResult assignment={a}/></li>;
      })}
     </ul>:<p>No activities have been assigned to this patient.</p>}
    </div>
   </>:null}
   {message?<p className={styles.success} role="status">{message}</p>:null}
   {error?<p className={styles.error} role="alert">{error}</p>:null}
  </>}
  <Link href="/doctor" className={styles.back}>Back to doctor workspace</Link>
 </section>;
}
