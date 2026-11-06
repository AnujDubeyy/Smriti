'use client';
import {useEffect,useState} from 'react';
import {useDemoCare,updateDemoCare} from '../lib/demo-care-store';
import {activityCatalog,isActivityCode,type Assignment,wordMatchTokens,wordMatches} from '../lib/assessment-activities';
import {AssessmentResult} from './assessment-result';
import {AssessmentRecorder,type RecorderState} from './assessment-recorder';
import {displayDate} from './day-first-date';
import {AssessmentPrompt} from './assessment-prompt';
import {AssessmentRecordingLibrary} from './assessment-recording-library';
import {saveAssessmentRecording,updateAssessmentRecordingTranscript} from '../lib/assessment-recordings';
import {Mascot} from './brand';
import styles from './patient-assessments.module.css';

const localeNames:Record<string,string>={'en-IN':'English','hi-IN':'हिन्दी · Hindi','mr-IN':'मराठी · Marathi'};
function BackIcon(){return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6M9 12h12"/></svg>}

export function PatientAssessments({patientId,name,locale,initial,localPreview=false}:{
 patientId:string;name:string;locale:string;initial:Assignment[];localPreview?:boolean
}){
 const demo=useDemoCare();
 const [liveAssignments,setAssignments]=useState(initial);
 const assignments=localPreview?demo.assignments:liveAssignments;
 const [selected,setSelected]=useState<string|null>(null);
 const [language,setLanguage]=useState(locale||'en-IN');
 const [count,setCount]=useState('');
 const [recording,setRecording]=useState(false);
 const [recorderState,setRecorderState]=useState<RecorderState>('idle');
 const [reply,setReply]=useState('');
 const [observation,setObservation]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [remaining,setRemaining]=useState(60);
 const [timerActive,setTimerActive]=useState(false);
 const [animalCountBusy,setAnimalCountBusy]=useState(false);
 const [animalCountStatus,setAnimalCountStatus]=useState('');
 const [animalNames,setAnimalNames]=useState<string[]>([]);
 const [analyzedTranscript,setAnalyzedTranscript]=useState('');
 const [recordingLibraryVersion,setRecordingLibraryVersion]=useState(0);
 const [activeRecordingId,setActiveRecordingId]=useState('');

 useEffect(()=>{
  if(!timerActive)return;
  const interval=window.setInterval(()=>setRemaining(v=>{
   if(v<=1){setTimerActive(false);return 0;}
   return v-1;
  }),1000);
  return()=>window.clearInterval(interval);
 },[timerActive]);
 useEffect(()=>{
  if(localPreview)return;const controller=new AbortController();
  const refresh=()=>{if(document.hidden)return;fetch('/api/v1/caretaker/assessments',{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>setAssignments(data.assignments)).catch(()=>{});};
  const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[localPreview]);
 useEffect(()=>{
  if(!activeRecordingId)return;
  const timer=window.setTimeout(()=>{void updateAssessmentRecordingTranscript(activeRecordingId,reply).then(()=>setRecordingLibraryVersion(value=>value+1)).catch(()=>{});},350);
  return()=>window.clearTimeout(timer);
 },[activeRecordingId,reply]);

 const pending=assignments.filter(a=>a.status==='assigned');
 const completed=assignments.filter(a=>a.status!=='assigned');
 const chosen=assignments.find(a=>a.id===selected);
 const code=chosen&&isActivityCode(chosen.instrument_code)?chosen.instrument_code:null;
 const title=code?activityCatalog.find(a=>a.code===code)?.title:'Assessment';
 const score=code==='smriti_word_repeat_v1'?wordMatches(reply,language):Number(count||0);

 async function analyzeAnimalCount(transcript:string){
  const text=transcript.trim();if(code!=='smriti_category_fluency_v1'||!text)return;
  setAnimalCountBusy(true);setAnimalCountStatus('Counting distinct animal names…');
  try{
   const response=await fetch('/api/v1/caretaker/assessments/animal-count',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient_id:patientId,assignment_id:chosen?.id,locale:language,transcript:text})});
   const data=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok||!Number.isInteger(data.count)||!Array.isArray(data.animals))throw new Error(data.error||'temporarily_unavailable');
   setCount(String(data.count));setAnimalNames(data.animals);setAnalyzedTranscript(text);setAnimalCountStatus('AI suggestion ready. Review the transcript and adjust the count if needed.');
  }catch{
   setAnalyzedTranscript('');setAnimalNames([]);setAnimalCountStatus('Could not count the transcript automatically. Enter the count manually if needed.');
  }finally{setAnimalCountBusy(false);}
 }

 function handleRecorderState(value:RecorderState){
  setRecorderState(value);
  if(value==='recording'){
   setRemaining(60);setTimerActive(code==='smriti_category_fluency_v1');
   if(code==='smriti_category_fluency_v1'){setReply('');setCount('');setAnimalNames([]);setAnimalCountStatus('Listening for animal names…');setAnalyzedTranscript('');}
  }
  else if(value==='transcribing'||value==='idle'){setTimerActive(false);}
 }

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!chosen||busy||!reply.trim())return;
  if(!code||recording||!count.trim())return;
  const task_score=Number(count);
  setBusy(true);setError('');setMessage('');
  try{
   if(activeRecordingId)await updateAssessmentRecordingTranscript(activeRecordingId,reply.trim());
   if(localPreview){updateDemoCare(state=>({...state,assignments:state.assignments.map(a=>a.id===chosen.id?{...a,status:'submitted',submitted_at:new Date().toISOString(),task_score,response_text:reply.trim(),caregiver_observation:observation.trim()}:a)}));}else{
    const response=await fetch('/api/v1/caretaker/assessments',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({patient_id:patientId,assignment_id:chosen.id,task_score,response_text:reply.trim(),caregiver_observation:observation.trim()})
    });
    const body=await response.json().catch(()=>({error:'temporarily_unavailable'}));
    if(!response.ok)throw new Error(body.error||'temporarily_unavailable');
   }
   setAssignments(items=>items.map(item=>item.id===chosen.id?{...item,status:'submitted',task_score,response_text:reply.trim(),caregiver_observation:observation.trim()}:item));
   setSelected(null);setReply('');setObservation('');setCount('');setAnimalNames([]);setAnimalCountStatus('');setAnalyzedTranscript('');setTimerActive(false);setRemaining(60);setActiveRecordingId('');
   setMessage('Response saved. Your doctor can review the transcript and activity count when sharing is enabled.');
  }catch(e){
   const m=e instanceof Error?e.message:'';
   setError(m==='assessment_already_completed'?'This activity has already been submitted. Refresh the page.':'Could not save the response. Check your connection and try again.');
  }finally{setBusy(false);}
 }

 function selectActivity(id:string){
  setCount('');setAnimalNames([]);setAnimalCountStatus('');setAnalyzedTranscript('');setSelected(id);setReply('');setObservation('');setRemaining(60);setError('');setMessage('');setRecorderState('idle');setActiveRecordingId('');
 }

 return <section className={styles.root}>
  <header className={styles.pageHead}>
   <div><p className={styles.eyebrow}>ASSESSMENT</p><h1>Activities for {name}</h1>
    <p className={styles.intro}>Take one activity at a time. You can listen again or type the patient’s response.</p></div>
   <span className={styles.activityCount}>{pending.length} {pending.length===1?'activity':'activities'} to do</span>
  </header>
  {message?<p role="status" className={styles.success}>{message}</p>:null}
  {error&&!chosen?<p role="alert" className={styles.error}>{error}</p>:null}
  {chosen&&code?<section className={styles.activity} aria-labelledby="active-assessment-title">
   <button className={styles.back} type="button" disabled={recording||busy} onClick={()=>{setSelected(null);setTimerActive(false);setRemaining(60);setError('');setRecorderState('idle');}}><BackIcon/> All activities</button>
   <div className={styles.activityHeading}>
    <div className={styles.activityTitle}><Mascot pillar="assessment"/><div><p className={styles.kicker}>YOUR ASSIGNED ACTIVITY</p><h2 id="active-assessment-title">{title}</h2></div></div>
    <label className={styles.language}>Prompt language<select value={language} disabled={recording||busy} onChange={e=>{setLanguage(e.target.value);setCount('');setReply('');}}>
     <option value="en-IN">English</option><option value="hi-IN">हिन्दी · Hindi</option><option value="mr-IN">मराठी · Marathi</option></select></label>
   </div>
   <div className={styles.sessionGrid}>
    <div className={styles.mainTask}>
     <AssessmentPrompt key={`${chosen.id}-${language}`} patientId={patientId} assignmentId={chosen.id} code={code} locale={language} preview={localPreview}/>
    </div>
    <aside className={styles.sessionAside} aria-label="Audio and privacy status">
     <div className={styles.gnaniStatus}><span className={styles.speakerIcon} aria-hidden="true">◖))</span><div><strong>Gnani speech</strong><span>{localeNames[language]||language}</span></div></div>
     <section className={styles.transcript} aria-labelledby="response-title">
      <div className={styles.responseHead}><div><p className={styles.kicker}>PATIENT RESPONSE</p><h3 id="response-title">Recognized words</h3></div>
       {code==='smriti_word_repeat_v1'&&reply?<span className={styles.score} aria-live="polite">{score} of 5 recognized</span>:null}
      </div>
      {reply?<p className={styles.transcriptWords} aria-live="polite">{wordMatchTokens(reply,language,code==='smriti_word_repeat_v1').map((token,index)=><span key={`${index}-${token.text}`} className={token.recognized?styles.recognized:undefined}>{token.text}</span>)}</p>
       :<p className={styles.transcriptPlaceholder} aria-live="polite">{recorderState==='recording'?'Listening to the patient…':recorderState==='transcribing'?'Transcribing with Gnani…':'The patient’s response will appear here after recording.'}</p>}
      <label className={styles.transcriptEdit}>Review or correct the transcript
       <textarea rows={3} maxLength={1500} value={reply} disabled={recording||recorderState==='transcribing'} onChange={e=>{setReply(e.target.value);if(code==='smriti_category_fluency_v1')setAnimalCountStatus('Transcript changed. Recount it or review and correct the number manually.');setCount(code==='smriti_word_repeat_v1'?String(wordMatches(e.target.value,language)):count);}} placeholder="You can also type the patient’s exact words here."/>
      </label>
      {code==='smriti_category_fluency_v1'?<div className={styles.animalCountReview}>
       <p role="status" aria-live="polite">{animalCountStatus||'An animal count will be suggested after recording finishes.'}</p>
       {analyzedTranscript&&analyzedTranscript!==reply.trim()?<p>The transcript changed after counting. Recount it, or review and correct the number manually.</p>:null}
       {animalNames.length?<p className={styles.animalNames}>Recognized animals: {animalNames.join(', ')}</p>:null}
       <button type="button" className={styles.analyzeAnimals} disabled={!reply.trim()||recording||recorderState==='transcribing'||animalCountBusy} onClick={()=>void analyzeAnimalCount(reply)}>{animalCountBusy?'Counting animals…':'Count animals in transcript'}</button>
      </div>:null}
     </section>
     {code==='smriti_word_repeat_v1'?<p className={styles.scoringNote}>Recognized words are highlighted for review. Check the transcript before saving.</p>:null}
     {code==='smriti_category_fluency_v1'?<div className={styles.timer}><div><span>{recorderState==='transcribing'?'Preparing transcript':timerActive?'Recording time remaining':remaining===0?'Time is up':'60-second response window'}</span><strong aria-live="polite">{remaining}s</strong></div></div>:null}
     <AssessmentRecorder key={chosen.id} patientId={patientId} locale={language} preview={localPreview} maxDurationMs={code==='smriti_category_fluency_v1'?60000:65000}
      onBusy={setRecording} onState={handleRecorderState}
      onText={text=>{setReply(text);setCount(code==='smriti_word_repeat_v1'?String(wordMatches(text,language)):count);}}
      onRecording={async capture=>{
       const id=crypto.randomUUID();
       await saveAssessmentRecording({id,ownerId:patientId,patientName:name,assignmentId:chosen.id,activityTitle:title||'Assessment',recordedAt:new Date().toISOString(),locale:language,...capture});
       setActiveRecordingId(id);setRecordingLibraryVersion(value=>value+1);
       if(code==='smriti_category_fluency_v1'&&capture.transcript.trim())void analyzeAnimalCount(capture.transcript);
      }}/>
     <p className={styles.localAudioNote}>After recording, it is saved in this browser on this device. Use the library below to export or share it.</p>
     <details className={styles.caregiverNotes}><summary>Caregiver observation <span>(optional)</span></summary><label>What did you notice?<textarea maxLength={1200} rows={3} value={observation} onChange={e=>setObservation(e.target.value)} placeholder={code==='smriti_category_fluency_v1'?'Optional: note whether you reviewed the suggested count or add context.':'For example, the patient needed the instruction repeated.'}/></label></details>
    </aside>
   </div>
   {error?<p role="alert" className={styles.error}>{error}</p>:null}
   {code!=='smriti_word_repeat_v1'?<>
    <label className={styles.countField}>{code==='smriti_category_fluency_v1'?'Animal count suggestion · edit if needed':'Caregiver-confirmed answers (out of 2)'}<input type="number" required min="0" max={code==='smriti_orientation_v1'?2:200} value={count} onChange={e=>setCount(e.target.value)}/></label>
   </>:<input type="hidden" value={count} readOnly/>}
   <form onSubmit={submit} className={styles.submitRow}>
    <p>Review the response before saving. Nothing is sent automatically.</p>
    <button type="submit" className={styles.submit} disabled={busy||recording||!reply.trim()||!count.trim()}>{busy?'Saving response…':'Save response'}</button>
   </form>
  </section>:<>
   <h2 className={styles.section}>Assigned activities</h2>
   {pending.length?<div className={styles.list}>{pending.map(a=>{
    const activity=activityCatalog.find(x=>x.code===a.instrument_code);if(!activity)return null;
    return <article className={styles.card} key={a.id}>
     <div className={styles.cardIdentity}><Mascot pillar="assessment"/><div><strong>{activity.title}</strong><p>{activity.description}</p>{a.due_date?<small>Due {displayDate(a.due_date)}</small>:null}</div></div>
     <button type="button" className={styles.begin} onClick={()=>selectActivity(a.id)}>Begin activity <span aria-hidden="true">→</span></button>
    </article>;
   })}</div>:<div className={styles.empty}><Mascot pillar="assessment"/><div><strong>No activities assigned yet</strong><p>Your doctor’s next activity will appear here.</p></div></div>}
   {completed.length?<section className={styles.completed}><h2>Submitted activities</h2><ul>{completed.map(a=><li key={a.id}><strong>{activityCatalog.find(x=>x.code===a.instrument_code)?.title||'Activity'}</strong><span>{a.status}</span><AssessmentResult assignment={a}/></li>)}</ul></section>:null}
  </>}
  <AssessmentRecordingLibrary ownerId={patientId} refreshKey={recordingLibraryVersion}/>
 </section>;
}
