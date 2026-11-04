'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import Image from 'next/image';
import styles from './onboarding-flow.module.css';

type Role='doctor'|'caregiver';
const languages=[['en-IN','English'],['hi-IN','हिन्दी'],['mr-IN','मराठी']] as const;
type Intake={caregiver_name:string;relationship:string;patient_name:string;date_of_birth:string;sex:string;family_count:string;support_notes:string;locale:string;audio_capture:boolean;transcript_retention:boolean;personalization:boolean;authorized:boolean;};
type Doctor={doctor_name:string;registration_number:string;organization:string;specialty:string;locale:string};
const readable:Record<string,string>={
 invalid_request:'Check the details and try again.',
 unauthorized:'Your session expired. Please sign in again.',
 not_configured:'Account setup is not configured yet.',
 role_already_selected:'Your account already has a different role. Please use your existing dashboard.',
 caregiver_role_required:'This account is not set up as Patient & Caregiver.',
 forbidden:'Your account cannot edit this profile.',
 invalid_birth_date:'Enter a valid birth date.',
 invalid_family_count:'Family count must be between 0 and 50.'
};

export function OnboardingFlow({initialRole=null,initialName='',initialPatient={},initialProfessional={}}:{
 initialRole?:Role|null;initialName?:string;initialPatient?:Record<string,unknown>;initialProfessional?:Record<string,unknown>;
}){
 const router=useRouter();
 const [role,setRole]=useState<Role|null>(initialRole);
 const [step,setStep]=useState(initialRole?1:0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [intake,setIntake]=useState<Intake>({
  caregiver_name:String(initialPatient.caregiver_name||initialName||''),relationship:String(initialPatient.relationship||''),
  patient_name:String(initialPatient.patient_name||''),date_of_birth:String(initialPatient.date_of_birth||''),
  sex:String(initialPatient.sex||'prefer_not_to_say'),family_count:String(initialPatient.family_count??''),
  support_notes:String(initialPatient.support_notes||''),locale:String(initialPatient.locale||'en-IN'),
  audio_capture:false,transcript_retention:false,personalization:false,authorized:false
 });
 const [doctor,setDoctor]=useState<Doctor>({
  doctor_name:String(initialProfessional.doctor_name||initialName||''),
  registration_number:String(initialProfessional.registration_number||''),
  organization:String(initialProfessional.organization||''),specialty:String(initialProfessional.specialty||''),
  locale:String(initialProfessional.locale||'en-IN')
 });
 const edit=(key:keyof Intake,value:string|boolean)=>setIntake(v=>({...v,[key]:value}));
 const editDoctor=(key:keyof Doctor,value:string)=>setDoctor(v=>({...v,[key]:value}));
 const labels=role==='doctor'?['Role','Doctor details']:['Role','Caregiver','Patient','Permissions'];
 async function save(){
  if(!role||busy)return;
  setBusy(true);setError('');
  try{
   const payload=role==='doctor'?{role,...doctor}:{role,...intake,family_count:Number(intake.family_count)};
   const response=await fetch('/api/v1/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
   const data=await response.json().catch(()=>({error:'temporarily_unavailable'}));
   if(!response.ok)throw new Error(data.error||'temporarily_unavailable');
   router.replace(data.next||'/');router.refresh();
  }catch(e){const code=e instanceof Error?e.message:'temporarily_unavailable';setError(readable[code]||'Could not save your details. Please try again.');}
  finally{setBusy(false);}
 }
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setError('');if(role==='caregiver'&&step<3)setStep(v=>v+1);else void save();}
 return <section className={styles.wrap}>
  <header className={styles.top}>
   <span className={styles.kicker}>YOUR SMRITI ACCOUNT</span>
   <h1>{step===0?'Who are you?':role==='doctor'?'Set up your doctor profile':step===1?'Tell us about you':step===2?'About the patient':'Choose permissions'}</h1>
   <p>{step===0?'Pick how you will use Smriti. Your clinical permissions are verified separately.'
    :role==='doctor'?'Complete your professional profile. Clinical access is reviewed independently.'
    :step===1?'Who is looking after the patient?'
    :step===2?'Start with the essentials. Stories and daily observations come later.'
    :'Decide what Smriti can use. Every choice can be changed later.'}</p>
  </header>
  <div className={styles.progress} aria-label="Setup progress">{labels.map((label,i)=>
   <div key={label} className={[styles.progressItem,i<=step?styles.progressActive:''].join(' ')} aria-current={step===i?'step':undefined}>
    <span>{i+1}</span><small>{label}</small>
   </div>)}</div>
  {step===0?<div className={styles.choiceGrid}>
   <button type="button" className={styles.choice} onClick={()=>{setRole('caregiver');setStep(1);}}>
    <Image src="/brand/companionship.webp" alt="" width={70} height={70}/>
    <strong>Patient & Caregiver</strong>
    <p>One care account. Set up the patient, talk with Smriti and keep daily observations.</p>
    <b>Continue</b>
   </button>
   <button type="button" className={styles.choice} onClick={()=>{setRole('doctor');setStep(1);}}>
    <Image src="/brand/monitoring.webp" alt="" width={70} height={70}/>
    <strong>Doctor</strong>
    <p>Create your professional profile, request verification and connect to authorized patients.</p>
    <b>Continue</b>
   </button>
  </div>:<form className={styles.form} onSubmit={submit}>
   {role==='doctor'?<div className={styles.group}>
    <label>Full name<input value={doctor.doctor_name} autoComplete="name" minLength={2} maxLength={120} required onChange={e=>editDoctor('doctor_name',e.target.value)}/></label>
    <label>Medical registration number<input value={doctor.registration_number} minLength={4} maxLength={80} required onChange={e=>editDoctor('registration_number',e.target.value)}/></label>
    <label>Hospital or organization (optional)<input value={doctor.organization} maxLength={160} onChange={e=>editDoctor('organization',e.target.value)}/></label>
    <label>Specialty (optional)<input value={doctor.specialty} maxLength={100} onChange={e=>editDoctor('specialty',e.target.value)}/></label>
    <label>Preferred language<select value={doctor.locale} onChange={e=>editDoctor('locale',e.target.value)}>{languages.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <p className={styles.notice}>Doctor accounts are not granted clinical access until identity verification and patient consent are approved.</p>
   </div>:step===1?<div className={styles.group}>
    <label>Your name<input value={intake.caregiver_name} autoComplete="name" minLength={2} maxLength={120} required onChange={e=>edit('caregiver_name',e.target.value)}/></label>
    <label>Your relationship to the patient<input placeholder="e.g. Daughter, spouse" value={intake.relationship} minLength={2} maxLength={100} required onChange={e=>edit('relationship',e.target.value)}/></label>
   </div>:step===2?<div className={styles.group}>
    <label>Patient’s name<input value={intake.patient_name} minLength={2} maxLength={120} required onChange={e=>edit('patient_name',e.target.value)}/></label>
    <div className={styles.two}>
     <label>Date of birth<input type="date" max={new Date().toISOString().slice(0,10)} value={intake.date_of_birth} required onChange={e=>edit('date_of_birth',e.target.value)}/></label>
     <label>Number of family members<input type="number" min="0" max="50" value={intake.family_count} required onChange={e=>edit('family_count',e.target.value)}/></label>
    </div>
    <div className={styles.two}>
     <label>Sex<select value={intake.sex} onChange={e=>edit('sex',e.target.value)}>
      <option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option>
     </select></label>
     <label>Conversation language<select value={intake.locale} onChange={e=>edit('locale',e.target.value)}>{languages.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    </div>
    <label>Daily support needs (optional)<textarea value={intake.support_notes} maxLength={2000} onChange={e=>edit('support_notes',e.target.value)} placeholder="You can add details later."/></label>
   </div>:<div className={styles.checks}>
    <p><strong>Prototype testing:</strong> Create a fictional patient profile. Do not enter real identifiable medical information until clinical/privacy validation is complete.</p>
    <label><input type="checkbox" checked={intake.audio_capture} onChange={e=>edit('audio_capture',e.target.checked)}/><span><b>Enable voice conversations</b><small>Allow temporary microphone processing. Raw audio is not retained.</small></span></label>
    <label><input type="checkbox" checked={intake.transcript_retention} onChange={e=>edit('transcript_retention',e.target.checked)}/><span><b>Keep conversation text</b><small>Save text transcripts for permitted care review.</small></span></label>
    <label><input type="checkbox" checked={intake.personalization} onChange={e=>edit('personalization',e.target.checked)}/><span><b>Use approved memories</b><small>Personal stories will require a separate approval before Smriti uses them.</small></span></label>
   </div>}
   {error?<p role="alert" className={styles.error}>{error}</p>:null}
   <div className={styles.actions}>
    <button type="button" className={styles.back} disabled={busy} onClick={()=>setStep(n=>Math.max(initialRole?1:0,n-1))}>Back</button>
    <button className={styles.primary} disabled={busy} type="submit">{busy?'Saving…':role==='doctor'||step===3?'Finish setup':'Continue'}</button>
   </div>
  </form>}
 </section>;
}
