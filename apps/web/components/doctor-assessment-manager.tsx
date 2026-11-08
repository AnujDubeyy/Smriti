'use client';
import {DayFirstDate,displayDate} from './day-first-date';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useDemoCare,updateDemoCare,demoId} from '../lib/demo-care-store';
import {type Assignment,type AssessmentCode} from '../lib/assessment-activities';
import {STANDARDIZED_INSTRUMENTS,TRIAL_ACTIVITIES,findInstrument,isStandardizedInstrument} from '../lib/assessment/instruments';
import {AssessmentResult} from './assessment-result';
import {DoctorRecordingImport} from './doctor-recording-import';
import {DoctorAssessmentReportModal} from './doctor-assessment-report-modal';
import {DoctorAssignModal} from './doctor-assign-modal';
import type {ActivityLocale} from '../lib/assessment/instruments';
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
 const [selectedReportAssignment,setSelectedReportAssignment]=useState<string|null>(null);
 const [assigningInstrument,setAssigningInstrument]=useState<string|null>(null);

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

 async function handleAssign(code:AssessmentCode,version:string,locale:ActivityLocale,targetDueDate:string){
  if(!selected||busy||!current?.sharing_enabled)return;
  if(localPreview){
   updateDemoCare(state=>({...state,assignments:[...state.assignments,{
    id:demoId(),
    instrument_code:code,
    instrument_version:version,
    locale,
    status:'assigned',
    due_date:targetDueDate||null,
    created_at:new Date().toISOString()
   }]}));
   setMessage(`Assigned ${code} (${version}) in ${locale} to ${current.patient_name}. Open Patient view to begin voice assessment.`);
   return;
  }
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/v1/doctor/assessments',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     patient_id:selected,
     instrument_code:code,
     instrument_version:version,
     locale,
     due_date:targetDueDate||null
    })
   });
   const body=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(body.error||'temporarily_unavailable');
   setAssignments(await load(selected));
   setMessage(`Assigned successfully. Smriti will administer the test in ${locale} with audio latency tracking.`);
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
   <span className={styles.eyebrow}>DOCTOR · COGNITIVE ASSESSMENTS</span>
   <h1>Assign an assessment</h1>
   <p>Choose a connected patient and an assessment. Administered by Smriti with hands-free voice interaction and audio-boundary response latency analysis.</p>
  </div>
  <DoctorRecordingImport/>
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
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:'1rem',flexWrap:'wrap',marginTop:'12px'}}>
     <label className={styles.label} style={{margin:0,flex:1,minWidth:'220px'}}>Due date <span className={styles.optional}>(optional)</span>
      <DayFirstDate value={dueDate} min={new Date().toISOString().slice(0,10)} onChange={setDueDate}/>
     </label>
     {current?.sharing_enabled&&current.status==='joined'&&(
      <button
       type="button"
       className={styles.clinicalButton}
       style={{width:'auto',minWidth:'200px',padding:'0 1.5rem'}}
       onClick={()=>setAssigningInstrument('six_cit_v1')}
       disabled={busy||loading}
      >
       + Assign assessment
      </button>
     )}
    </div>
   </div>

   {current?.sharing_enabled&&current.status==='joined'?<>
    {/* Section 1: Standardized Clinical Assessments */}
    <header className={styles.sectionHeader}>
     <h2>Standardized Clinical Assessments (Voice-Administered)</h2>
     <p>Structured cognitive screenings administered deterministically by Smriti with hands-free voice interaction, millisecond response latency tracking, and clinical timeline reporting.</p>
    </header>

    <div className={styles.demoNotice} role="note">
     <strong>Demonstration Mode Notice</strong>
     Demonstration items and uncopyrighted practice materials are active for system verification. Official diagnostic scoring and clinical deployment for MoCA Blind and Kingshill 6CIT require institutional licensing, clinician administration certification, and publisher electronic permissions.
    </div>

    <div className={styles.catalog}>
     {STANDARDIZED_INSTRUMENTS.map(activity=>{
      const awaiting=assignments.some(a=>a.instrument_code===activity.code&&(a.status==='assigned'||a.status==='in_progress'));
      return <article key={activity.code} className={styles.activity}>
       <div className={styles.activityTop}>
        <strong>{activity.title}</strong>
        <span>{activity.estimatedDuration}</span>
       </div>
       <div className={styles.metaRow}>
        <span className={`${styles.badge} ${styles.badgeClinical}`}>Voice Administered</span>
        <span className={`${styles.badge} ${styles.badgeTrial}`}>Demo Mode</span>
       </div>
       <p>{activity.description}</p>
       <small style={{color:'#655e55',fontSize:'12px',lineHeight:'1.4'}}>
        <strong>Domains:</strong> {activity.clinicalPurpose}
       </small>
       <small style={{color:'#88681b',fontSize:'11px',fontWeight:700}}>
        Languages: English (en-IN), हिन्दी (hi-IN), मराठी (mr-IN)
       </small>
       <button type="button" className={styles.clinicalButton} disabled={busy||loading||awaiting||dueDate==='invalid'}
        onClick={()=>setAssigningInstrument(activity.code)}>{awaiting?'Already assigned':busy?'Assigning…':'Configure & Assign voice assessment'}</button>
      </article>;
     })}
    </div>

    {/* Section 2: Trial / Familiarization Activities */}
    <header className={styles.sectionHeader}>
     <h2>Trial / Familiarization Activities</h2>
     <p>Given by doctor to make patient and caregiver comfortable with the voice interface and microphone before standardized clinical assessments.</p>
    </header>

    <div className={styles.catalog}>
     {TRIAL_ACTIVITIES.map(activity=>{
      const awaiting=assignments.some(a=>a.instrument_code===activity.code&&(a.status==='assigned'||a.status==='in_progress'));
      return <article key={activity.code} className={styles.activity}>
       <div className={styles.activityTop}>
        <strong>{activity.title}</strong>
        <span>{activity.estimatedDuration}</span>
       </div>
       <div className={styles.metaRow}>
        <span className={`${styles.badge} ${styles.badgeTrial}`}>Trial / Practice</span>
       </div>
       <p>{activity.description}</p>
       <small style={{color:'#655e55',fontSize:'12px',lineHeight:'1.4'}}>
        <strong>Purpose:</strong> {activity.clinicalPurpose}
       </small>
       <button type="button" disabled={busy||loading||awaiting||dueDate==='invalid'}
        onClick={()=>setAssigningInstrument(activity.code)}>{awaiting?'Already assigned':busy?'Assigning…':'Configure & Assign trial exercise'}</button>
      </article>;
     })}
    </div>

    {/* Assigned Activities List */}
    <div className={styles.card}>
     <h2>Assigned activities</h2>
     {loading?<p role="status">Loading…</p>:assignments.length?<ul className={styles.assigned}>
      {assignments.map(a=>{
       const inst=findInstrument(a.instrument_code);
       const title=inst?.title||'Activity';
       const isClinical=isStandardizedInstrument(a.instrument_code);
       const langLabel=a.locale==='hi-IN'?'हिन्दी · hi-IN':a.locale==='mr-IN'?'मराठी · mr-IN':'en-IN';
       return <li key={a.id}>
        <div style={{display:'flex',flexDirection:'column',gap:'4px',flex:1,minWidth:'220px'}}>
         <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
          <strong>{title}</strong>
          <span className={`${styles.badge} ${isClinical?styles.badgeClinical:styles.badgeTrial}`}>
           {isClinical?'Clinical Assessment':'Trial Exercise'}
          </span>
          <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'8px',background:'#f0ede6',color:'#555'}}>
           🗣️ {langLabel}
          </span>
          {a.instrument_version && (
           <span style={{fontSize:'11px',color:'#777'}}>
            v{a.instrument_version}
           </span>
          )}
         </div>
         {a.due_date?<small>Due {displayDate(a.due_date)}</small>:null}
        </div>
        <span className={a.status==='submitted'?styles.badgeSuccess:undefined}>
         {a.status==='submitted'?'Response submitted':a.status==='assigned'?'Awaiting response':a.status}
        </span>
        <button
         type="button"
         className={styles.reportBtn}
         onClick={()=>setSelectedReportAssignment(a.id)}
        >
         View Clinical Voice Report
        </button>
        <AssessmentResult assignment={a}/>
       </li>;
      })}
     </ul>:<p>No activities have been assigned to this patient.</p>}
    </div>
   </>:null}
   {message?<p className={styles.success} role="status">{message}</p>:null}
   {error?<p className={styles.error} role="alert">{error}</p>:null}
  </>}
  <Link href="/doctor" className={styles.back}>Back to doctor workspace</Link>

  {assigningInstrument && (
   <DoctorAssignModal
    patientName={current?.patient_name || 'Patient'}
    initialInstrumentCode={assigningInstrument}
    initialDueDate={dueDate}
    onAssign={handleAssign}
    onClose={()=>setAssigningInstrument(null)}
    isAlreadyAssigned={(code)=>assignments.some(a=>a.instrument_code===code&&(a.status==='assigned'||a.status==='in_progress'))}
    busy={busy}
   />
  )}

  {selectedReportAssignment && (
   <DoctorAssessmentReportModal
    assignmentId={selectedReportAssignment}
    onClose={()=>setSelectedReportAssignment(null)}
   />
  )}
 </section>;
}
