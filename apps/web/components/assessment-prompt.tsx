'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {activityPrompt,type ActivityCode} from '../lib/assessment-activities';
import styles from './patient-assessments.module.css';

function subtitleLines(text:string){
 const sentences=text.split(/(?<=[.!?।])\s*/u).map(value=>value.trim()).filter(Boolean);
 return sentences.flatMap(sentence=>{
  const pieces=sentence.split(/,\s*/u).map(value=>value.trim()).filter(Boolean);
  return pieces.length>1?pieces:sentence.match(/.{1,54}(?:\s|$)/gu)?.map(value=>value.trim()).filter(Boolean)??[sentence];
 });
}
function activeLineAt(lines:string[],time:number,duration:number){
 if(!lines.length||!Number.isFinite(duration)||duration<=0)return 0;
 const weights=lines.map(line=>Math.max(1,Array.from(line).length));
 const target=(Math.min(time,duration)/duration)*weights.reduce((sum,value)=>sum+value,0);
 let cursor=0;
 for(let i=0;i<weights.length;i++){cursor+=weights[i];if(target<=cursor)return i;}
 return lines.length-1;
}

export function AssessmentPrompt({patientId,assignmentId,code,locale,preview}:{patientId:string;assignmentId:string;code:ActivityCode;locale:string;preview:boolean}){
 const prompt=activityPrompt(code,locale);
 const lines=useMemo(()=>subtitleLines(prompt),[prompt]);
 const audioRef=useRef<HTMLAudioElement|null>(null);
 const urlRef=useRef('');
 const [loading,setLoading]=useState(false);
 const [ready,setReady]=useState(false);
 const [playing,setPlaying]=useState(false);
 const [lineIndex,setLineIndex]=useState(-1);
 const [status,setStatus]=useState('');
 useEffect(()=>()=>{audioRef.current?.pause();if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
 async function togglePrompt(){
  setStatus('');
  if(preview){setStatus('Gnani audio is unavailable in the local preview.');return;}
  if(audioRef.current){
   if(audioRef.current.paused){try{await audioRef.current.play();setPlaying(true);setStatus('');}catch{setStatus('Tap again to play the prompt.');}}
   else{audioRef.current.pause();setPlaying(false);}
   return;
  }
  setLoading(true);setLineIndex(-1);
  try{
   const response=await fetch('/api/v1/caretaker/assessments/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient_id:patientId,assignment_id:assignmentId,locale})});
   if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error==='voice_not_configured'?'Gnani voice is not configured. Ask the caregiver to help and try again later.':'Could not load the Gnani voice prompt. Try again or ask the caregiver for help.');}
   const url=URL.createObjectURL(await response.blob());urlRef.current=url;
   const audio=new Audio(url);audio.preload='auto';audioRef.current=audio;
   audio.ontimeupdate=()=>setLineIndex(activeLineAt(lines,audio.currentTime,audio.duration));
   audio.onended=()=>{setPlaying(false);setLineIndex(-1);};
   audio.onerror=()=>{setPlaying(false);setLineIndex(-1);setStatus('Prompt audio could not be played. Try again.');};
   setReady(true);
   try{await audio.play();setPlaying(true);}catch{setStatus('Prompt is ready. Tap play to hear it.');}
  }catch(error){setStatus(error instanceof Error?error.message:'Could not load the prompt audio.');}
  finally{setLoading(false);}
 }
 return <section className={styles.promptCard} aria-label="Spoken assessment prompt">
  <div className={styles.promptMeta}><span className={styles.gnaniDot} aria-hidden="true"/><span>Gnani voice · {locale==='hi-IN'?'Hindi':locale==='mr-IN'?'Marathi':'English'}</span></div>
  <div className={styles.subtitleStage} aria-live="polite" aria-atomic="true">
   {lineIndex>0?<p className={styles.subtitlePrevious} aria-hidden="true">{lines[lineIndex-1]}</p>:null}
   {lineIndex>=0?<p className={styles.subtitleActive}>{lines[lineIndex]}</p>:<p className={styles.subtitlePlaceholder}>{ready?'Prompt finished. You can listen again.':'The spoken instruction will appear here, then disappear.'}</p>}
  </div>
  <div className={styles.promptActions}>
   <button type="button" className={styles.promptButton} onClick={()=>void togglePrompt()} disabled={loading}>
    <span aria-hidden="true">{loading?'…':playing?'Ⅱ':ready?'▶':'◖))'}</span>{loading?'Loading voice…':playing?'Pause prompt':ready?'Play prompt again':'Hear instructions'}
   </button>
   {status?<p role="status" className={styles.promptStatus}>{status}</p>:null}
  </div>
  {code!=='smriti_word_repeat_v1'?<details className={styles.writtenPrompt}><summary>Need the written instruction?</summary><p>{prompt}</p></details>:null}
 </section>;
}
