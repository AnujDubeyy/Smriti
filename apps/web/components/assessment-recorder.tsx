'use client';
import {useEffect,useRef,useState} from 'react';
import {encodeWav} from '../lib/voice/audio';

export function AssessmentRecorder({patientId,locale,preview,onText,onBusy}:{patientId:string;locale:string;preview:boolean;onText:(text:string)=>void;onBusy:(value:boolean)=>void}){
 const [state,setState]=useState<'idle'|'starting'|'recording'|'transcribing'>('idle');
 const [notice,setNotice]=useState('');
 const [playback,setPlayback]=useState('');
 const recording=useRef<MediaRecorder|null>(null);
 const lifecycle=useRef<AbortController|null>(null);
 const microphone=useRef<MediaStream|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const session=useRef('');
 function stopSession(){
  const id=session.current;session.current='';
  if(id)void fetch('/api/v1/voice/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:id}),keepalive:true}).catch(()=>{});
 }
 useEffect(()=>()=>{lifecycle.current?.abort();clearTimeout(timer.current);if(recording.current?.state==='recording')recording.current.stop();microphone.current?.getTracks().forEach(t=>t.stop());stopSession();},[]);
 useEffect(()=>()=>{if(playback)URL.revokeObjectURL(playback);},[playback]);
 async function start(){
  const controller=new AbortController();lifecycle.current=controller;
  const {signal}=controller;
  setState('starting');onBusy(true);setNotice('');setPlayback('');
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('This browser cannot record audio. Type the response below.');
   if(!preview){
    const r=await fetch('/api/v1/voice/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient_id:patientId,locale}),signal});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error==='consent_required'?'Enable microphone processing in Care permissions before recording.':'Voice service unavailable. You can type the response below.');
    session.current=data.id;
   }
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(signal.aborted){stream.getTracks().forEach(t=>t.stop());return;}
   microphone.current=stream;
   const recorder=new MediaRecorder(stream);recording.current=recorder;
   const chunks:BlobPart[]=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{
    clearTimeout(timer.current);stream.getTracks().forEach(t=>t.stop());
    if(signal.aborted)return;
    const blob=new Blob(chunks,{type:recorder.mimeType});setPlayback(URL.createObjectURL(blob));
    let context:AudioContext|undefined;
    try{
     if(preview){setNotice('Play the clip and enter the words below. Automatic transcription requires a signed-in care account.');return;}
     setState('transcribing');context=new AudioContext();
     const audio=await context.decodeAudioData(await blob.arrayBuffer());const samples=audio.getChannelData(0);
     const words:string[]=[];
     for(let i=0;i<samples.length;i+=audio.sampleRate*28){
      const chunk=samples.subarray(i,i+audio.sampleRate*28);if(chunk.length<audio.sampleRate/10)break;
      const r=await fetch('/api/v1/voice/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav','x-session-id':session.current,'x-turn-id':crypto.randomUUID()},body:encodeWav(chunk,audio.sampleRate) as BodyInit,signal});
      const data=await r.json();if(!r.ok||!data.textRaw?.trim())throw new Error();
      words.push(data.textRaw.trim());
     }
     if(!words.length)throw new Error();
     if(!signal.aborted){onText(words.join(' '));setNotice('Review the transcript before saving. The recording is available here until you leave the activity.');}
    }catch{if(!signal.aborted)setNotice('Transcription failed. Play the recording and type the words below.');}
    finally{if(context)void context.close();stopSession();if(!signal.aborted){setState('idle');onBusy(false);}}
   };
   recorder.start();setState('recording');timer.current=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},65000);
  }catch(error){
   microphone.current?.getTracks().forEach(t=>t.stop());stopSession();
   if(!signal.aborted){setState('idle');onBusy(false);setNotice(error instanceof DOMException?'Microphone unavailable. Check browser permission or type the response below.':error instanceof Error?error.message:'Could not start recording.');}
  }
 }
 return <div><button type="button" disabled={state==='starting'||state==='transcribing'} onClick={()=>state==='recording'?recording.current?.stop():void start()}>{state==='recording'?'Stop recording':state==='starting'?'Opening microphone…':state==='transcribing'?'Transcribing…':'Record spoken answer'}</button>
 {state==='recording'&&<p role="status">Recording · stops after 65 seconds</p>}
 {playback&&<audio controls src={playback} aria-label="Recorded answer" style={{maxWidth:'100%'}}/>}
 {notice&&<p role="status">{notice}</p>}</div>;
}
