import {z} from 'zod';
import {createHash} from 'node:crypto';
import {requireCare,failure,CareError} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
import {providerConfig,respond} from '../../../../../lib/voice/server';
import {transcribe,synthesize} from '../../../../../lib/voice/gnani';
import {asksToStop,itemSchema,type AIInput} from '../../../../../lib/voice/ai';
import {MAX_AUDIO_BYTES,inspectWav} from '../../../../../lib/voice/audio';
export const maxDuration=90;
const base=z.object({session_id:z.uuid()});
const start=z.object({patient_id:z.uuid(),locale:z.enum(['en-IN','hi-IN','mr-IN']),synthetic:z.literal(true)}).strict();
const reviewed=base.extend({turn_id:z.uuid(),text:z.string().trim().min(1).max(3000),history:z.array(z.object({speaker:z.enum(['user','assistant']),text:z.string().max(1200)}).strict()).max(8)}).strict();
async function readAudio(request:Request){const reader=request.body?.getReader();if(!reader)throw new CareError('invalid_audio');let n=0;const parts:Uint8Array[]=[];try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>MAX_AUDIO_BYTES){await reader.cancel();throw new CareError('audio_size',413);}parts.push(r.value);}}finally{reader.releaseLock();}const audio=new Uint8Array(n);let offset=0;for(const p of parts){audio.set(p,offset);offset+=p.length;}inspectWav(audio);return audio;}
export async function POST(request:Request,{params}:{params:Promise<{operation:string}>}){
 try{if(!sameOrigin(request))throw new CareError('forbidden',403);const client=await requireCare();const {operation}=await params;
 const rpc=async(op:string,input:object)=>{const r=await client.rpc('smriti_voice',{operation:op,input});if(r.error)throw r.error;return r.data;};
 if(operation==='transcribe'){
  const ids=reviewed.pick({session_id:true,turn_id:true}).parse({session_id:request.headers.get('x-session-id'),turn_id:request.headers.get('x-turn-id')});
  if(request.headers.get('content-type')!=='audio/wav')throw new CareError('audio_format',415);
  const audio=await readAudio(request);const c=providerConfig();const claim=await rpc('claim',{...ids,hash:createHash('sha256').update(audio).digest('hex')});if(claim.duplicate)throw new CareError('duplicate_turn',409);
  try{const result=c.mode==='mock'?{textRaw:'I would like a quiet moment.',provider:'mock',model:'mock-stt'}:await transcribe(audio,claim.locale,c.speech,request.signal);await rpc('check',ids);return json({...result,turn_id:ids.turn_id,mode:c.mode});}
  catch(e){await rpc('fail',ids).catch(()=>{});throw e;}
 }
 const raw=await limitedBody(request,18000);if(raw===null)throw new CareError('payload_too_large',413);const input=JSON.parse(raw);
 if(operation==='start')return json({...await rpc('start',start.parse(input)),mode:providerConfig().mode});
 if(operation==='stop')return json(await rpc('stop',base.strict().parse(input)));
 if(operation==='check')return json(await rpc('check',base.strict().parse(input)));
 if(operation==='logs'||operation==='add_log'||operation==='analyze'){
  const data=(operation==='add_log'?z.object({patient_id:z.uuid(),text:z.string().trim().min(1).max(2000)}):z.object({patient_id:z.uuid()})).strict().parse(input);
  if(operation==='add_log')return json(await rpc('add_log',data));
  const records=await rpc('logs',data);if(operation==='logs')return json(records);
  if(!records.synthetic)throw new CareError('synthetic_only',403);
  if(!records.logs.length)return json({result:{reply:'No observations are available to summarize.',findings:[],references:[],stop:false,limitations:['No evidence available.']},provider:'none'});
  const a:AIInput={mode:'log_analysis',locale:'en-IN',text:'Summarize only the supplied observations.',approved_context:[],logs:z.array(itemSchema).parse(records.logs.map((x:{id:string;text:string;created_at:string})=>({id:x.id,text:x.text,recorded_at:x.created_at}))),history:[]};
  // Durable per-user quota, also on analysis requests, before an external call.
  const rate=await client.rpc('smriti_ai_quota');if(rate.error)throw rate.error;
  const output=await respond(a,request.signal);await rpc('logs',data);return json(output);
 }
 if(operation==='respond'){
  const data=reviewed.parse(input);const state=await rpc('check',data);await rpc('reserve_response',data);
  try{if(asksToStop(data.text)){await rpc('stop',data);return json({result:{reply:'We can stop here.',stop:true,references:[],findings:[],limitations:[]},mode:'deterministic',audio:null});}
   const context=await rpc('context',{patient_id:state.patient_id});
   const output=await respond({mode:'companion',locale:state.locale,text:data.text,approved_context:z.array(itemSchema).parse(context.items),logs:[],history:data.history},request.signal);
   await rpc('check',data);const c=providerConfig();let audio:Uint8Array|null=null;
   if(!output.result.stop&&c.mode==='live')audio=await synthesize(output.result.reply,state.locale,c.voice,c.speech,request.signal);
   await rpc('check',data);await rpc('finish',{...data,transcript:data.text,result:output.result,metadata:{stt:'prisma-v3.0',tts:c.mode==='live'?'timbre-v3.0':'mock',llm:output.model,provenance:'client_turn_unverified',mode:c.mode}});
   if(output.result.stop)await rpc('stop',data);
   return json({...output,audio:audio?Buffer.from(audio).toString('base64'):null,contentType:audio?'audio/wav':null});
  }catch(e){await rpc('fail',data).catch(()=>{});throw e;}
 }
 throw new CareError('not_found',404);
 }catch(e){return failure(e);}
}
