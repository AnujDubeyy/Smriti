'use client';
import {useEffect,useState} from 'react';
import {useDemoCare,updateDemoCare} from '../lib/demo-care-store';
import {activityCatalog,activityPrompt,isActivityCode,type Assignment,type ActivityCode} from '../lib/assessment-activities';
import styles from './patient-assessments.module.css';
export function PatientAssessments({patientId,name,locale,initial,localPreview=false}:{
 patientId:string;name:string;locale:string;initial:Assignment[];localPreview?:boolean
}){
 const demo=useDemoCare();
 const [liveAssignments,setAssignments]=useState(initial);
 const assignments=localPreview?demo.assignments:liveAssignments;
 const [selected,setSelected]=useState<string|null>(null);
 const [reply,setReply]=useState('');
 const [observation,setObservation]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [remaining,setRemaining]=useState(60);
 const [timerActive,setTimerActive]=useState(false);
 useEffect(()=>{
  if(!timerActive)return;
  const interval=window.setInterval(()=>setRemaining(v=>{
   if(v<=1){setTimerActive(false);return 0;}
   return v-1;
  }),1000);
  return()=>window.clearInterval(interval);
 },[timerActive]);
 useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);
 useEffect(()=>{
  if(localPreview)return;const controller=new AbortController();
  const refresh=()=>{if(document.hidden)return;fetch('/api/v1/caretaker/assessments',{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>setAssignments(data.assignments)).catch(()=>{});};
  const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[localPreview]);
 const pending=assignments.filter(a=>a.status==='assigned');
 const completed=assignments.filter(a=>a.status!=='assigned');
 const chosen=assignments.find(a=>a.id===selected);
 const code=chosen&&isActivityCode(chosen.instrument_code)?chosen.instrument_code:null;
 function sayPrompt(task:ActivityCode){
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(activityPrompt(task,locale));
  utterance.lang=locale;
  utterance.rate=0.84;
  window.speechSynthesis.speak(utterance);
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!chosen||busy||!reply.trim())return;
  setBusy(true);setError('');setMessage('');
  try{
   if(localPreview){updateDemoCare(state=>({...state,assignments:state.assignments.map(a=>a.id===chosen.id?{...a,status:'submitted',submitted_at:new Date().toISOString(),response_text:reply.trim(),caregiver_observation:observation.trim()}:a)}));}else{
   const response=await fetch('/api/v1/caretaker/assessments',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     patient_id:patientId,assignment_id:chosen.id,
     response_text:reply.trim(),caregiver_observation:observation.trim()
    })
   });
   const body=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(body.error||'temporarily_unavailable');
   }
   setAssignments(items=>items.map(item=>item.id===chosen.id?{...item,status:'submitted'}:item));
   setSelected(null);setReply('');setObservation('');setTimerActive(false);
   setRemaining(60);
   window.speechSynthesis?.cancel();
   setMessage('Response saved. Your doctor can review it when sharing permission is enabled.');
  }catch(e){
   const m=e instanceof Error?e.message:'';
   setError(m==='assessment_already_completed'
    ?'This activity has already been submitted. Refresh the page.'
    :'Could not save the response. Check your connection and try again.');
  }finally{setBusy(false);}
 }
 return <section className={styles.root}>
  <span className={styles.eyebrow}>PATIENT & CARETAKER</span>
  <h1>Assessments</h1>
  <p className={styles.intro}>Activities assigned for {name}. A caretaker should support the patient, read prompts aloud when needed and record their exact responses.</p>
  <p className={styles.warning}>These are original, unscored demonstration activities, not diagnostic tests. They do not replace clinician-administered assessments or produce medical scores.</p>
  {message?<p role="status" className={styles.success}>{message}</p>:null}
  {error?<p role="alert" className={styles.error}>{error}</p>:null}
  {chosen&&code?<section className={styles.activity}>
   <button className={styles.back} type="button" onClick={()=>{window.speechSynthesis?.cancel();setSelected(null);setTimerActive(false);setRemaining(60);setError('');}}>← All activities</button>
   <h2>{activityCatalog.find(a=>a.code===code)?.title}</h2>
   <p className={styles.prompt}>{activityPrompt(code,locale)}</p>
   <button type="button" className={styles.listen} onClick={()=>sayPrompt(code)}>▶ Hear prompt aloud</button>
   {code==='smriti_category_fluency_v1'?<div className={styles.timer}>
    <strong>{remaining} seconds</strong>
    <button type="button" onClick={()=>{setRemaining(60);setTimerActive(true);}}>Start 60-second timer</button>
    <button type="button" onClick={()=>setTimerActive(false)}>Pause</button>
   </div>:null}
   <form onSubmit={submit}>
    <label>Patient's words or answer
     <textarea required maxLength={1500} rows={4} value={reply} onChange={e=>setReply(e.target.value)}
      placeholder="Caregiver: record what the patient actually said. Do not correct the response."/>
    </label>
    <label>Caretaker observation (optional)
     <textarea maxLength={1200} rows={3} value={observation} onChange={e=>setObservation(e.target.value)}
      placeholder="e.g. Needed the prompt repeated or felt tired"/>
    </label>
    <button type="submit" className={styles.submit} disabled={busy||!reply.trim()}>
     {busy?'Saving…':'Save response'}
    </button>
   </form>
  </section>:<>
   <h2 className={styles.section}>Assigned activities</h2>
   {pending.length?<div className={styles.list}>{pending.map(a=>{
    const activity=activityCatalog.find(x=>x.code===a.instrument_code);
    if(!activity)return null;
    return <article className={styles.card} key={a.id}>
     <div><strong>{activity.title}</strong><p>{activity.description}</p>
      {a.due_date?<small>Due: {a.due_date}</small>:null}</div>
     <button type="button" onClick={()=>{
      setSelected(a.id);setReply('');setObservation('');setRemaining(60);setError('');setMessage('');
     }}>Begin activity</button>
    </article>;
   })}</div>:<div className={styles.empty}>
    <strong>No activities assigned yet</strong>
    <p>Your doctor can choose an activity in their Assessment workspace. It will appear here automatically after assignment.</p>
   </div>}
   {completed.length?<section className={styles.completed}>
    <h2>Submitted activities</h2>
    <ul>{completed.map(a=><li key={a.id}>{activityCatalog.find(x=>x.code===a.instrument_code)?.title||'Activity'} — {a.status}</li>)}</ul>
   </section>:null}
  </>}
 </section>;
}
