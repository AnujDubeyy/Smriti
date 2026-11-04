'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePreferences} from '../app/preferences';
import {encodeWav} from '../lib/voice/audio';
import {PcmFrameEncoder} from '../lib/voice/pcm';
import styles from './voice-call.module.css';

type Stage='idle'|'connecting'|'listening'|'hearing'|'thinking'|'speaking'|'ended';
type Entry={speaker:'patient'|'smriti';text:string;time:string};
type Reply={result:{reply:string;stop:boolean};provider?:string;audio?:string|null;audioError?:string|null};
const LANGUAGES=[
 ['en-IN','English'],['hi-IN','हिन्दी'],['mr-IN','मराठी'],['bn-IN','বাংলা'],
 ['gu-IN','ગુજરાતી'],['pa-IN','ਪੰਜਾਬੀ'],['kn-IN','ಕನ್ನಡ'],['te-IN','తెలుగు'],
 ['ta-IN','தமிழ்'],['ml-IN','മലയാളം']
] as const;
const friendly:Record<string,string>={
 ai_auth:'Gemini key is invalid or does not have access. Check it in Vercel.',
 ai_model_unavailable:'The selected Gemini model is not available for this API key.',
 ai_request_rejected:'Gemini rejected the request. Check the model and its configuration.',
 ai_response_invalid:'Smriti received an invalid response. Please try again.',
 ai_incomplete:'Smriti could not complete that reply. Please try again.',
 ai_unavailable:'Gemini could not connect. The call is still open. Try again.',
 provider_timeout:'The response timed out. Please try again.',
 provider_rate_limit:'The provider is busy or has reached its quota.',
 voice_not_configured:'Voice keys are not configured on the Smriti server.',
 stt_unavailable:'Speech recognition is unavailable. Please try speaking again.',
 tts_unavailable:'Timbre could not create audio. The reply is shown as text.',
 invalid_tts_audio:'Timbre returned audio the browser could not use.',
 consent_required:'Allow microphone processing in this patient’s Care permissions.',
 synthetic_only:'Only fictional test profiles can use live calls in this prototype.',
 forbidden:'Your account cannot access this patient. Choose another profile.',
 session_inactive:'The call ended because access or consent changed.',
 no_speech:'I could not hear that clearly. Try once more.'
};
async function request(op:string,body:object,signal?:AbortSignal):Promise<any>{
 const r=await fetch('/api/v1/voice/'+op,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
 const data=await r.json().catch(()=>({error:'server_unavailable'}));
 if(!r.ok)throw new Error(data.error||'server_unavailable');
 return data;
}
function message(error:unknown){
 const key=error instanceof Error?error.message:String(error);
 return friendly[key]||'The call encountered an error. You can try again without restarting.';
}
/** Test-data only. Speech/audio is processed transiently and never written to browser storage. */
export function VoiceStudio({patientId}:{patientId?:string;demo?:boolean}){
 const {locale}=usePreferences();
 const [language,setLanguage]=useState(locale);
 const [stage,setStage]=useState<Stage>('idle');
 const [consent,setConsent]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('Choose your language, then call Smriti.');
 const [muted,setMuted]=useState(false);
 const [speakerOff,setSpeakerOff]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [captions,setCaptions]=useState<Entry[]>([]);
 const [showCaptions,setShowCaptions]=useState(false);
 const [lastReply,setLastReply]=useState('');
 const [playbackBlocked,setPlaybackBlocked]=useState(false);
 const [transport,setTransport]=useState<'connecting'|'streaming'|'fallback'>('connecting');
 const stageRef=useRef<Stage>('idle');
 const active=useRef(false);
 const sessionId=useRef('');
 const stream=useRef<MediaStream|null>(null);
 const context=useRef<AudioContext|null>(null);
 const processor=useRef<ScriptProcessorNode|null>(null);
 const ws=useRef<WebSocket|null>(null);
 const streamReady=useRef(false);
 const pcm=useRef<PcmFrameEncoder|null>(null);
 const player=useRef<HTMLAudioElement|null>(null);
 const objectUrl=useRef('');
 const abort=useRef<AbortController|null>(null);
 const clock=useRef(0);
 const history=useRef<{speaker:'user'|'assistant';text:string}[]>([]);
 const mutedRef=useRef(false);
 const speakerRef=useRef(false);
 const epoch=useRef(0);
 const noise=useRef(.007);
 const speechMs=useRef(0);
 const silenceMs=useRef(0);
 const recorded=useRef<Float32Array[]>([]);
 const preRoll=useRef<Float32Array[]>([]);
 const recordedSamples=useRef(0);
 const processFrame=useRef<(frame:Float32Array,rate:number)=>void>(()=>{});
 const streamRetry=useRef(0);
 const reconnect=useRef<ReturnType<typeof setTimeout>|null>(null);
 const update=useCallback((next:Stage,description?:string)=>{
  stageRef.current=next;setStage(next);if(description)setStatus(description);
 },[]);
 const append=useCallback((speaker:Entry['speaker'],text:string)=>{
  setCaptions(old=>[...old,{speaker,text,time:new Date().toISOString()}].slice(-60));
 },[]);
 const stopPlayback=useCallback(()=>{
  const a=player.current;if(a){a.pause();a.removeAttribute('src');a.load();}
  if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current='';}
  setPlaybackBlocked(false);
 },[]);
 const releaseMicrophone=useCallback(()=>{
  if(processor.current){processor.current.onaudioprocess=null;processor.current.disconnect();processor.current=null;}
  stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
  void context.current?.close();context.current=null;
  recorded.current=[];preRoll.current=[];recordedSamples.current=0;
 },[]);
 const resetCapture=useCallback(()=>{
  recorded.current=[];preRoll.current=[];recordedSamples.current=0;
  speechMs.current=0;silenceMs.current=0;
  if(active.current)update('listening',mutedRef.current?'Microphone is muted':'I’m listening. You can speak naturally.');
 },[update]);
 const endCall=useCallback((reason='Call ended')=>{
  const old=sessionId.current;sessionId.current='';active.current=false;epoch.current++;
  abort.current?.abort();ws.current?.close();ws.current=null;streamReady.current=false;
  if(reconnect.current)clearTimeout(reconnect.current);reconnect.current=null;
  pcm.current=null;stopPlayback();releaseMicrophone();
  update('ended',reason);setTransport('connecting');setMuted(false);mutedRef.current=false;
  if(old)void request('stop',{session_id:old}).catch(()=>{});
 },[stopPlayback,releaseMicrophone,update]);
 const finishAnswer=useCallback(async(reply:Reply,version:number)=>{
  if(!active.current||epoch.current!==version)return;
  const line=reply.result?.reply?.trim();
  if(line){append('smriti',line);setLastReply(line);history.current.push({speaker:'assistant',text:line.slice(0,1200)});}
  history.current=history.current.slice(-8);
  if(reply.result?.stop){endCall('Smriti ended the call.');return;}
  if(reply.audioError)setError(friendly[reply.audioError]||'Timbre could not speak the reply.');
  if(!reply.audio||speakerRef.current){
   if(!reply.audio&&!reply.audioError)setError('Smriti replied in text but no audio was returned. Check Timbre settings.');
   resetCapture();return;
  }
  try{
   stopPlayback();
   const bytes=Uint8Array.from(atob(reply.audio),(c)=>c.charCodeAt(0));
   objectUrl.current=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));
   if(!player.current)throw new Error('audio_missing');
   player.current.src=objectUrl.current;player.current.muted=speakerRef.current;
   update('speaking','Smriti is speaking…');
   await player.current.play();setPlaybackBlocked(false);
  }catch{
   setPlaybackBlocked(true);update('speaking','Your browser blocked sound. Tap “Hear Smriti”.');
  }
 },[append,endCall,resetCapture,stopPlayback,update]);
 const handleSpeech=useCallback(async(text:string,source:'stream'|'rest',turnId?:string)=>{
  const said=text.trim().slice(0,3000);
  if(!said||!active.current||!sessionId.current)return;
  const version=epoch.current;
  update('thinking','Smriti is thinking…');setError('');
  abort.current?.abort();abort.current=new AbortController();
  const previous=history.current.slice(-8);
  append('patient',said);history.current.push({speaker:'user',text:said.slice(0,1200)});
  try{
   const reply=await request('respond',{session_id:sessionId.current,turn_id:turnId||crypto.randomUUID(),text:said,history:previous,source},abort.current.signal) as Reply;
   await finishAnswer(reply,version);
  }catch(e){
   if(epoch.current!==version)return;
   setError(message(e));resetCapture();
  }
 },[append,finishAnswer,resetCapture,update]);
 const processClip=useCallback(async(frames:Float32Array[],sampleRate:number)=>{
  if(!active.current||stageRef.current==='thinking')return;
  const version=epoch.current;update('thinking','Understanding your words…');setError('');
  abort.current?.abort();abort.current=new AbortController();
  try{
   const size=frames.reduce((n,f)=>n+f.length,0);if(size<sampleRate*.2)throw new Error('no_speech');
   const joined=new Float32Array(size);let at=0;for(const f of frames){joined.set(f,at);at+=f.length;}
   const wav=encodeWav(joined,sampleRate);joined.fill(0);
   const turnId=crypto.randomUUID();
   const response=await fetch('/api/v1/voice/transcribe',{method:'POST',headers:{
     'Content-Type':'audio/wav','x-session-id':sessionId.current,'x-turn-id':turnId
   },body:wav as BodyInit,signal:abort.current.signal,cache:'no-store'});
   wav.fill(0);
   const body=await response.json().catch(()=>({error:'stt_unavailable'}));
   if(epoch.current!==version)return;
   if(!response.ok)throw new Error(body.error||'stt_unavailable');
   if(!body.textRaw?.trim())throw new Error('no_speech');
   // REST transcription has already claimed the turn in Supabase.
   await handleSpeech(body.textRaw,'rest',turnId);
  }catch(e){if(epoch.current!==version)return;setError(message(e));resetCapture();}
 },[handleSpeech,resetCapture,update]);
 const say=useCallback(async(kind:'greeting'|'story')=>{
  if(!active.current||!sessionId.current)return;
  const version=epoch.current;abort.current?.abort();abort.current=new AbortController();
  stopPlayback();update('thinking',kind==='story'?'Preparing a story…':'Smriti is joining…');setError('');
  try{
   const output=await request('prompt',{session_id:sessionId.current,turn_id:crypto.randomUUID(),kind,history:history.current.slice(-8)},abort.current.signal);
   await finishAnswer(output,version);
  }catch(e){if(epoch.current!==version)return;setError(message(e));resetCapture();}
 },[finishAnswer,resetCapture,stopPlayback,update]);
 const connectStream=useCallback(async()=>{
  if(!active.current||!sessionId.current||!process.env.NEXT_PUBLIC_SMRITI_GATEWAY_URL)return;
  try{
   const ticket=await request('realtime-ticket',{session_id:sessionId.current});
   if(!active.current)return;
   const target=new URL(ticket.url);
   if(target.protocol!=='wss:')throw new Error('gateway_not_secure');
   const socket=new WebSocket(target.toString(),['smriti.v1','ticket.'+ticket.ticket]);
   ws.current=socket;
   socket.onmessage=(event)=>{
    try{
     const data=JSON.parse(String(event.data));
     if(data.type==='connected'){
      streamReady.current=true;pcm.current=null;streamRetry.current=0;setTransport('streaming');
     }else if(data.type==='transcript'&&typeof data.text==='string'&&data.text.trim()&&stageRef.current!=='thinking'&&stageRef.current!=='speaking'){
      void handleSpeech(data.text,'stream');
     }else if(data.type==='speech_start'&&stageRef.current==='listening')update('hearing','I can hear you…');
     else if(data.type==='error')setError('Prisma streaming: '+String(data.message||'connection error').slice(0,140));
    }catch{setError('Speech stream sent an unreadable event.');}
   };
   socket.onclose=()=>{
    if(ws.current===socket){ws.current=null;streamReady.current=false;pcm.current=null;setTransport('fallback');}
    if(active.current&&streamRetry.current<2){
      streamRetry.current++;reconnect.current=setTimeout(()=>void connectStream(),streamRetry.current*1800);
    }
   };
   socket.onerror=()=>{setTransport('fallback');};
  }catch{if(active.current)setTransport('fallback');}
 },[handleSpeech,update]);
 processFrame.current=(input:Float32Array,rate:number)=>{
  if(!active.current||mutedRef.current)return;
  const stageNow=stageRef.current;
  if(stageNow==='thinking'||stageNow==='speaking'||stageNow==='connecting'||stageNow==='ended')return;
  if(streamReady.current&&ws.current?.readyState===WebSocket.OPEN){
   if(!pcm.current)pcm.current=new PcmFrameEncoder(rate);
   pcm.current.write(input,(frame)=>{if(ws.current?.readyState===WebSocket.OPEN&&ws.current.bufferedAmount<160000)ws.current.send(frame);});
   return;
  }
  const rms=Math.sqrt(input.reduce((sum,value)=>sum+value*value,0)/input.length);
  const frameMs=input.length/rate*1000;
  const level=Math.max(.015,noise.current*3.4);
  if(stageNow==='listening'){
   const copy=new Float32Array(input);preRoll.current.push(copy);
   if(preRoll.current.length>5)preRoll.current.shift();
   if(rms>level)speechMs.current+=frameMs;else{
    speechMs.current=0;noise.current=noise.current*.992+rms*.008;
   }
   if(speechMs.current>=290){
    recorded.current=preRoll.current;recordedSamples.current=recorded.current.reduce((n,f)=>n+f.length,0);
    preRoll.current=[];silenceMs.current=0;update('hearing','I can hear you…');
   }
  }else if(stageNow==='hearing'){
   recorded.current.push(new Float32Array(input));recordedSamples.current+=input.length;
   silenceMs.current=rms>level?0:silenceMs.current+frameMs;
   if(silenceMs.current>=900||recordedSamples.current>=rate*18){
    const frames=recorded.current;recorded.current=[];recordedSamples.current=0;
    speechMs.current=0;silenceMs.current=0;update('thinking','Understanding your words…');
    void processClip(frames,rate);
   }
  }
 };
 async function start(){
  if(active.current||!patientId||!consent)return;
  const version=++epoch.current;setError('');setLastReply('');setCaptions([]);history.current=[];setElapsed(0);setTransport('connecting');
  update('connecting','Connecting to Smriti…');
  try{
   const started=await request('start',{patient_id:patientId,locale:language,synthetic:true});
   if(epoch.current!==version)return;sessionId.current=started.id;
   if(started.mode==='mock')throw new Error('voice_not_configured');
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone requires HTTPS.');
   const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
   if(epoch.current!==version){mic.getTracks().forEach(t=>t.stop());return;}
   stream.current=mic;
   const ctx=new AudioContext({latencyHint:'interactive'});context.current=ctx;await ctx.resume();
   const source=ctx.createMediaStreamSource(mic), node=ctx.createScriptProcessor(4096,1,1);
   processor.current=node;
   node.onaudioprocess=e=>processFrame.current(e.inputBuffer.getChannelData(0),ctx.sampleRate);
   source.connect(node);const silent=ctx.createGain();silent.gain.value=0;node.connect(silent);silent.connect(ctx.destination);
   clock.current=Date.now();active.current=true;
   if(process.env.NEXT_PUBLIC_SMRITI_GATEWAY_URL)void connectStream();
   void say('greeting');
  }catch(e){
   if(epoch.current!==version)return;setError(message(e));endCall('Unable to start this call.');
  }
 }
 useEffect(()=>{
  if(stage==='idle'||stage==='ended')return;
  const id=setInterval(()=>setElapsed(Math.floor((Date.now()-clock.current)/1000)),1000);
  return()=>clearInterval(id);
 },[stage]);
 useEffect(()=>{
  const leave=()=>{if(active.current)endCall('Call disconnected.');};
  window.addEventListener('pagehide',leave);
  return()=>{window.removeEventListener('pagehide',leave);leave();};
 },[endCall]);
 const inCall=active.current&&stage!=='ended';
 const clockText=Math.floor(elapsed/60).toString().padStart(2,'0')+':'+(elapsed%60).toString().padStart(2,'0');
 if(!patientId)return <section className={styles.entry}>
  <h1>Call Smriti</h1><p>Choose a care profile before starting a private conversation.</p>
  <Link className="button companionship" href="/patients/select">Choose patient profile</Link>
  <p className={styles.small}>Voice calls require an account and microphone permission. There is no fake “Begin call” demo.</p>
 </section>;
 return <section className={styles.shell} aria-label="Smriti voice companion">
  <header className={styles.header}><div><span className={styles.eyebrow}>COMPANIONSHIP</span><h1>Call Smriti</h1></div>
   <label className={styles.language}>Call language
    <select value={language} disabled={inCall||stage==='connecting'} onChange={e=>setLanguage(e.target.value as typeof language)}>
     {LANGUAGES.map(([key,label])=><option value={key} key={key}>{label}</option>)}
    </select>
   </label>
  </header>
  <div className={styles.stage}>
   <div className={styles.clock}>{inCall?clockText:'A familiar voice, whenever you need one'}</div>
   <div className={styles.avatar} data-stage={stage}><img src="/brand/companionship.webp" alt="" width="150" height="150"/></div>
   <h2>Smriti</h2><p className={styles.state} role="status">{stage==='idle'?'Ready to call':stage==='ended'?'Call ended':stage==='connecting'?'Connecting…':stage==='thinking'?'Thinking…':stage==='hearing'?'Hearing you…':stage==='speaking'?'Speaking…':'Listening…'}</p>
   <p className={styles.detail}>{status}</p>
   {lastReply&&<div className={styles.reply} role="log"><strong>Smriti</strong><p>{lastReply}</p></div>}
   {playbackBlocked&&<div className={styles.controls}>
    <button className="button companionship" onClick={()=>void player.current?.play().then(()=>setPlaybackBlocked(false)).catch(()=>setError('Your browser blocked sound. Check audio permissions.'))}>Hear Smriti</button>
    <button className="button secondary" onClick={()=>{stopPlayback();resetCapture();}}>Skip audio</button>
   </div>}
  </div>
  <audio ref={player} onEnded={()=>{stopPlayback();resetCapture();}} onError={()=>{setError('Your browser could not play the audio response.');resetCapture();}} preload="auto"/>
  {!inCall&&<label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to temporary microphone processing for this fictional test profile. Transcript retention is controlled separately in Care permissions.</span></label>}
  <div className={styles.controls}>
   {!inCall?<button className={styles.start} disabled={!consent||stage==='connecting'} onClick={()=>void start()}>☎ Call Smriti</button>:<>
    <button className={styles.control} onClick={()=>{mutedRef.current=!mutedRef.current;setMuted(mutedRef.current);if(!mutedRef.current)resetCapture();}}>{muted?'Unmute':'Mute'} microphone</button>
    <button className={styles.control} onClick={()=>{speakerRef.current=!speakerRef.current;setSpeakerOff(speakerRef.current);if(player.current)player.current.muted=speakerRef.current;}}>{speakerOff?'Unmute':'Mute'} speaker</button>
    <button className={styles.control} disabled={stage==='thinking'||stage==='connecting'} onClick={()=>void say('story')}>Tell me a story</button>
    <button className={styles.end} onClick={()=>endCall()}>End call</button>
   </>}
  </div>
  {inCall&&<p className={styles.connection}>{transport==='streaming'?'Prisma live recognition':transport==='fallback'?'Automatic speech recognition':'Connecting speech recognition'}</p>}
  {error&&<div role="alert" className={styles.error}>{error}</div>}
  <div className={styles.bottom}>
   <button className="button secondary" onClick={()=>setShowCaptions(v=>!v)} aria-expanded={showCaptions}>{showCaptions?'Hide':'Show'} captions ({captions.length})</button>
   <Link className="button secondary" href={'/permissions?patient='+patientId}>Care permissions</Link>
  </div>
  {showCaptions&&<div className={styles.captions} role="log">{captions.length?captions.map((entry,i)=><div className={entry.speaker==='smriti'?styles.smritiLine:styles.patientLine} key={entry.time+i}><strong>{entry.speaker==='smriti'?'Smriti':'You'}</strong><p lang={language}>{entry.text}</p></div>):<p>The conversation will appear here.</p>}</div>}
  <p className={styles.small}>This test call uses Gnani speech and Gemini responses when configured. Sound requires browser permission. Conversations are not diagnoses. Do not enter real patient information in this prototype.</p>
 </section>;
}
