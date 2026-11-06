import {observationDigest} from '../../../../../lib/log-digest';
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {requireCare,failure,CareError} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
import {providerConfig,respond} from '../../../../../lib/voice/server';
import {groqTranscribe} from '../../../../../lib/voice/groq';
import {transcribe,synthesize} from '../../../../../lib/voice/gnani';
import {asksToStop,itemSchema,supportSchema,type AIInput} from '../../../../../lib/voice/ai';
import {MAX_AUDIO_BYTES,inspectWav} from '../../../../../lib/voice/audio';
import {VOICE_LANGUAGE_CODES} from '../../../../../lib/voice/languages';
export const maxDuration=90;
const base=z.object({session_id:z.uuid()});
const start=z.object({patient_id:z.uuid(),locale:z.enum(VOICE_LANGUAGE_CODES),synthetic:z.boolean().optional()}).strict();
const prompt=base.extend({turn_id:z.uuid(),kind:z.enum(['greeting','story']),history:z.array(z.object({speaker:z.enum(['user','assistant']),text:z.string().max(1200)}).strict()).max(8)}).strict();
const reviewed=base.extend({turn_id:z.uuid(),text:z.string().trim().min(1).max(3000),source:z.enum(['stream','rest']).optional(),history:z.array(z.object({speaker:z.enum(['user','assistant']),text:z.string().max(1200)}).strict()).max(8)}).strict();
async function readAudio(request:Request){const reader=request.body?.getReader();if(!reader)throw new CareError('invalid_audio');let n=0;const parts:Uint8Array[]=[];try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>MAX_AUDIO_BYTES){await reader.cancel();throw new CareError('audio_size',413);}parts.push(r.value);}}finally{reader.releaseLock();}const audio=new Uint8Array(n);let offset=0;for(const p of parts){audio.set(p,offset);offset+=p.length;}inspectWav(audio);return audio;}
export async function POST(request:Request,{params}:{params:Promise<{operation:string}>}){
 try{if(!sameOrigin(request))throw new CareError('forbidden',403);const client=await requireCare();const {operation}=await params;
 const rpc=async(op:string,input:object)=>{const r=await client.rpc('smriti_voice',{operation:op,input});if(r.error)throw r.error;return r.data;};
 if(operation==='transcribe'||operation==='assessment_transcribe'){
  const ids=reviewed.pick({session_id:true,turn_id:true}).parse({session_id:request.headers.get('x-session-id'),turn_id:request.headers.get('x-turn-id')});
  if(request.headers.get('content-type')!=='audio/wav')throw new CareError('audio_format',415);
  const audio=await readAudio(request);const c=operation==='assessment_transcribe'?null:providerConfig();
  const speechKey=operation==='assessment_transcribe'?process.env.GNANI_API_KEY_ID:c?.speech;
  if(!speechKey)throw new CareError('voice_not_configured',503);
  const claim=await rpc('claim',{...ids,hash:createHash('sha256').update(audio).digest('hex')});if(claim.duplicate)throw new CareError('duplicate_turn',409);
  try{const result=operation==='assessment_transcribe'?await transcribe(audio,claim.locale,speechKey,request.signal):await (c?.speechProvider==='groq'?groqTranscribe:transcribe)(audio,claim.locale,speechKey,request.signal);await rpc('check',ids);return json({...result,turn_id:ids.turn_id,mode:'live'});}
  catch(e){await rpc('fail',ids).catch(()=>{});throw e;}
 }
 const raw=await limitedBody(request,18000);if(raw===null)throw new CareError('payload_too_large',413);const input=JSON.parse(raw);
 if(operation==='diagnostics'){
  const test=z.object({locale:z.enum(VOICE_LANGUAGE_CODES)}).strict().parse(input);
  const config=providerConfig();if(config.mode!=='live')throw new CareError('voice_not_configured',503);
  // Quota guard: never expose unauthenticated or unlimited provider tests.
  const q=await client.rpc('smriti_ai_quota');if(q.error)throw q.error;
  const safeError=(error:unknown,fallback:string)=>{const value=error instanceof Error?error.message:'';return ['ai_auth','ai_model_unavailable','ai_request_rejected','ai_incomplete','ai_unavailable','ai_response_invalid','provider_timeout','provider_rate_limit','tts_unavailable','invalid_tts_audio','invalid_tts'].includes(value)?value:fallback;};
  let gemini:{ok:boolean;code?:string}={ok:false},timbre:{ok:boolean;code?:string}={ok:false};
  let sample:string|null=null;
  try{
   await respond({mode:'companion',locale:test.locale,text:'Please say a short warm greeting to a fictional listener. Do not mention family members or medical information.',approved_context:[],logs:[],history:[]},request.signal);
   gemini={ok:true};
  }catch(e){gemini={ok:false,code:safeError(e,'ai_unavailable')};}
  try{
   const bytes=await synthesize('Hello, I am Smriti.',test.locale,config.voice,config.ttsKey,request.signal);
   timbre={ok:true};sample=Buffer.from(bytes).toString('base64');
  }catch(e){timbre={ok:false,code:safeError(e,'tts_unavailable')};}
  return json({gemini,timbre,sample,model:config.model});
 }
 if(operation==='start'){
  const config=providerConfig();
  return json({...await rpc('start',start.parse(input)),mode:config.mode,streaming:config.speechProvider==='gnani'});
 }
 if(operation==='prompt'){
  const data=prompt.parse(input),state=await rpc('check',data);
  const claim=await rpc('claim',{...data,hash:createHash('sha256').update('ui:'+data.kind+':'+data.turn_id).digest('hex')});
  if(claim.duplicate)throw new CareError('duplicate_turn',409);
  await rpc('reserve_response',data);
  try{
   const [context,support]=await Promise.all([
    rpc('context',{patient_id:state.patient_id}),
    client.rpc('smriti_conversation_support',{target:state.patient_id})
   ]);
   if(support.error)throw support.error;
   const support_profile=supportSchema.parse(support.data||{});
   const instruction=data.kind==='greeting'
    ?'Please introduce yourself briefly as Smriti in the selected language. Offer one warm greeting and one easy question. Do not claim to be a relative.'
    :'Tell one gentle spoken story in the selected language. Only use a personal memory when it is present in the approved context. Otherwise, clearly make it a fictional story. Do not quiz the listener.';
   const output=await respond({mode:'companion',locale:state.locale,text:instruction,approved_context:z.array(itemSchema).parse(context.items||[]),logs:[],history:data.history,support_profile},request.signal);
   const config=providerConfig();let audio:Uint8Array|null=null;let audioError:string|null=null;
   if(config.ttsKey)try{audio=await synthesize(output.result.reply,state.locale,config.voice,config.ttsKey,request.signal);}
   catch(e){audioError=e instanceof Error?e.message:'tts_unavailable';}
   await rpc('check',data);
   await rpc('finish',{...data,transcript:data.kind==='greeting'?'[Smriti greeting requested]':'[Smriti story requested]',result:output.result,metadata:{provenance:'ui_'+data.kind,stt:'not_applicable',tts:audio?'timbre-v2.5':audioError?'failed':'none',llm:output.model}});
   return json({...output,audio:audio?Buffer.from(audio).toString('base64'):null,audioError});
  }catch(e){await rpc('fail',data).catch(()=>{});throw e;}
 }
 if(operation==='stop')return json(await rpc('stop',base.strict().parse(input)));
 if(operation==='check')return json(await rpc('check',base.strict().parse(input)));
 if(operation==='logs'||operation==='add_log'||operation==='analyze'){
  const data=(operation==='add_log'?z.object({patient_id:z.uuid(),text:z.string().trim().min(1).max(2000)}):z.object({patient_id:z.uuid()})).strict().parse(input);
  if(operation==='add_log')return json(await rpc('add_log',data));
  const records=await rpc('logs',data);if(operation==='logs'){const {data:turns,error}=await client.from('voice_turns').select('id,session_id,transcript,result,created_at').eq('patient_id',data.patient_id).eq('status','complete').order('created_at',{ascending:false}).limit(100);if(error)throw error;return json({...records,turns});}

  if(!records.logs.length)return json({result:{reply:'No observations are available to summarize.',findings:[],references:[],stop:false,limitations:['No evidence available.']},provider:'none'});
  if(!process.env.GROQ_API_KEY&&!process.env.GEMINI_API_KEY)return json({result:observationDigest(records.logs),provider:'extractive',notice:'AI is not configured. This digest lists the recorded evidence without interpretation.'});
  const a:AIInput={mode:'log_analysis',locale:'en-IN',text:'Summarize only the supplied observations.',approved_context:[],logs:z.array(itemSchema).parse(records.logs.map((x:{id:string;text:string;created_at:string})=>({id:x.id,text:x.text,recorded_at:x.created_at}))),history:[]};
  // Durable per-user quota, also on analysis requests, before an external call.
  const rate=await client.rpc('smriti_ai_quota');if(rate.error)throw rate.error;
  try{const output=await respond(a,request.signal);await rpc('logs',data);return json(output);}
  catch(error){if(request.signal.aborted)throw error;await rpc('logs',data);return json({result:observationDigest(records.logs),provider:'extractive',notice:'AI analysis is unavailable. Showing the recorded evidence instead.'});}
 }
 if(operation==='respond'){
  const data=reviewed.parse(input);const state=await rpc('check',data);
  // REST STT already claimed a turn. Stream transcripts need an explicit claim
  // before reservation, and are marked as browser-supplied/unverified for audit.
  if(data.source==='stream'){
   const hash=createHash('sha256').update('stream:'+data.text).digest('hex');
   const claim=await rpc('claim',{...data,hash});
   if(claim.duplicate)throw new CareError('duplicate_turn',409);
  }
  await rpc('reserve_response',data);
  try{if(asksToStop(data.text)){await rpc('stop',data);return json({result:{reply:'We can stop here.',stop:true,references:[],findings:[],limitations:[]},mode:'deterministic',audio:null});}
   const [context,support]=await Promise.all([
    rpc('context',{patient_id:state.patient_id}),
    client.rpc('smriti_conversation_support',{target:state.patient_id})
   ]);
   if(support.error)throw support.error;
   const support_profile=supportSchema.parse(support.data||{});
   const output=await respond({mode:'companion',locale:state.locale,text:data.text,approved_context:z.array(itemSchema).parse(context.items),logs:[],history:data.history,support_profile},request.signal);
   await rpc('check',data);const c=providerConfig();let audio:Uint8Array|null=null;let audioError:string|null=null;
   if(!output.result.stop&&c.ttsKey)try{audio=await synthesize(output.result.reply,state.locale,c.voice,c.ttsKey,request.signal);}catch(e){audioError=e instanceof Error?e.message:'tts_unavailable';}
   await rpc('check',data);await rpc('finish',{...data,transcript:data.text,result:output.result,metadata:{stt:data.source==='stream'?'prisma-stream':'prisma-rest',tts:audio?'timbre-v2.5':audioError?'failed':'none',llm:output.model,provenance:'browser_transcript_unverified',mode:c.mode}});
   if(output.result.stop)await rpc('stop',data);
   return json({...output,audio:audio?Buffer.from(audio).toString('base64'):null,audioError,contentType:audio?'audio/wav':null});
  }catch(e){await rpc('fail',data).catch(()=>{});throw e;}
 }
 throw new CareError('not_found',404);
 }catch(e){return failure(e);}
}
