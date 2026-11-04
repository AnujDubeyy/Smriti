import {z} from 'zod';
import {SYSTEM_PROMPT,PROMPT_VERSION} from './prompts.ts';
export const itemSchema=z.object({id:z.string().uuid(),text:z.string().max(2000),recorded_at:z.iso.datetime({offset:true}).optional()});
export type Evidence=z.infer<typeof itemSchema>;
export const resultSchema=z.object({reply:z.string().min(1).max(1200),references:z.array(z.string().uuid()).max(20),stop:z.boolean(),findings:z.array(z.object({text:z.string().max(500),source_ids:z.array(z.string().uuid()).min(1).max(5),quotes:z.array(z.object({source_id:z.string().uuid(),text:z.string().min(1).max(500)})).min(1).max(5)}).strict()).max(10),limitations:z.array(z.string().max(300)).max(6)}).strict();
export type AIResult=z.infer<typeof resultSchema>;
export type AIInput={mode:'companion'|'log_analysis';locale:string;text:string;approved_context:Evidence[];logs:Evidence[];history:{speaker:'user'|'assistant';text:string}[]};
export function asksToStop(text:string){return /\b(stop|pause|end conversation|don't want to talk|do not want to talk)\b|रुको|रुकिए|बंद करो|थांब|थांबा/iu.test(text);}
export function validateEvidence(value:unknown,input:AIInput){
 const r=resultSchema.parse(value);const items=input.mode==='log_analysis'?input.logs:input.approved_context;const map=new Map(items.map(x=>[x.id,x.text]));
 if(r.references.some(id=>!map.has(id)))throw new Error('unsupported_reference');
 for(const f of r.findings){if(f.source_ids.some(id=>!map.has(id))||f.quotes.some(q=>!f.source_ids.includes(q.source_id)||!map.get(q.source_id)?.includes(q.text))||f.source_ids.some(id=>!f.quotes.some(q=>q.source_id===id)))throw new Error('unsupported_evidence');}
 if(input.mode==='companion'&&r.findings.length)throw new Error('invalid_findings');
 const content=[r.reply,...r.findings.map(f=>f.text)].join(' ');
 if(/[<>]/u.test(content)||/\b(diagnos(?:e|ed|is)|dementia is worsening|cognitive decline|increase (?:your |the )?dose|stop taking (?:your )?medication|you have dementia)\b/iu.test(content))throw new Error('unsafe_output');
 if(input.mode==='companion'&&!r.references.length&&/\byour (son|daughter|wife|husband)|\byou (used to|were born)|आपके बेटे|तुमच्या मुला/iu.test(r.reply))throw new Error('unsupported_personal_claim');
 if(input.mode==='log_analysis')r.reply='AI draft based only on the cited observations. Review the evidence and limitations below.';
 return r;
}
export function mockAI(input:AIInput):AIResult{return{reply:asksToStop(input.text)?'We can stop here.':'This is a demo response. We can take our time. Would you like a quiet moment?',references:[],stop:asksToStop(input.text),findings:[],limitations:['Deterministic mock; no AI analysis was performed.']};}
/** Minimal JSON schema: Gemini accepts a subset of JSON Schema, not the full Zod export. */
const outputSchema={
 type:'object',properties:{
  reply:{type:'string'},references:{type:'array',items:{type:'string'}},
  stop:{type:'boolean'},findings:{type:'array',items:{type:'object',properties:{
   text:{type:'string'},source_ids:{type:'array',items:{type:'string'}},
   quotes:{type:'array',items:{type:'object',properties:{source_id:{type:'string'},text:{type:'string'}},required:['source_id','text']}
  },required:['text','source_ids','quotes']}},
  limitations:{type:'array',items:{type:'string'}}
 },required:['reply','references','stop','findings','limitations']
};
/** No hidden retries or mock substitution. Provider errors are categorized without exposing prompts. */
export async function gemini(input:AIInput,config:{key:string;model:string},signal:AbortSignal,transport:typeof fetch=fetch){
 if(asksToStop(input.text))return{...mockAI(input),reply:'We can stop here.',limitations:[]};
 if(!/^gemini-[a-z0-9.-]+$/.test(config.model))throw new Error('model_config');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort('timeout'),25000);
 let response:Response;
 try{
  response=await transport('https://generativelanguage.googleapis.com/v1beta/models/'+config.model+':generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.key},
   body:JSON.stringify({
    systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},
    contents:[{role:'user',parts:[{text:JSON.stringify({...input,prompt_version:PROMPT_VERSION})}]}],
    generationConfig:{
     temperature:0.35,maxOutputTokens:1600,
     responseMimeType:'application/json',responseJsonSchema:outputSchema,
     ...(config.model==='gemini-2.5-flash'?{thinkingConfig:{thinkingBudget:0}}:{})
    }
   }),signal:AbortSignal.any([signal,controller.signal]),cache:'no-store'
  });
 }catch(e){
  if(signal.aborted)throw new Error('call_cancelled');
  throw new Error(controller.signal.aborted?'provider_timeout':'ai_unavailable');
 }finally{clearTimeout(timeout);}
 if(!response.ok){
  // Never log model input, key, response body, or patient information.
  console.error('Smriti Gemini request failed', {status:response.status,model:config.model});
  if(response.status===401||response.status===403)throw new Error('ai_auth');
  if(response.status===404)throw new Error('ai_model_unavailable');
  if(response.status===429)throw new Error('provider_rate_limit');
  if(response.status===400||response.status===422)throw new Error('ai_request_rejected');
  if(response.status===408||response.status===504)throw new Error('provider_timeout');
  throw new Error('ai_unavailable');
 }
 let data:unknown;
 try{data=JSON.parse(new TextDecoder().decode(await boundedResponse(response,100000)));}
 catch{throw new Error('ai_incomplete');}
 const result=data as {candidates?:Array<{finishReason?:string,content?:{parts?:Array<{thought?:boolean,text?:string}>}}>};
 const candidate=result.candidates?.[0];
 if(candidate?.finishReason!=='STOP')throw new Error('ai_incomplete');
 const text=candidate.content?.parts?.filter(x=>!x.thought&&typeof x.text==='string').map(x=>x.text).join('');
 if(!text)throw new Error('ai_incomplete');
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw new Error('ai_incomplete');}
 try{return validateEvidence(parsed,input);}catch{throw new Error('ai_response_invalid');}
}
export async function boundedResponse(response:Response,max:number){const reader=response.body?.getReader();if(!reader)throw new Error('empty_response');const parts:Uint8Array[]=[];let n=0;try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>max){await reader.cancel();throw new Error('response_size');}parts.push(r.value);}}finally{reader.releaseLock();}const out=new Uint8Array(n);let p=0;for(const x of parts){out.set(x,p);p+=x.length;}return out;}
