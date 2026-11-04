import {boundedResponse,validateEvidence,type AIInput} from './ai.ts';
import {SYSTEM_PROMPT} from './prompts.ts';
import {inspectWav} from './audio.ts';
async function checked(response:Response){if(!response.ok)throw new Error(response.status===429?'provider_rate_limit':response.status===401||response.status===403?'ai_auth':'ai_unavailable');return JSON.parse(new TextDecoder().decode(await boundedResponse(response,100000)));}
export async function groq(input:AIInput,config:{key:string;model:string},signal:AbortSignal,transport:typeof fetch=fetch){
 const response=await transport('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,temperature:0.35,max_completion_tokens:1600,response_format:{type:'json_object'},messages:[{role:'system',content:SYSTEM_PROMPT+' Return a JSON object with reply (string), references (UUID array), stop (boolean), findings (array of {text,source_ids,quotes:[{source_id,text}]}), limitations (string array). No markdown.'},{role:'user',content:JSON.stringify(input)}]}),signal:AbortSignal.any([signal,AbortSignal.timeout(25000)]),cache:'no-store'});
 const data=await checked(response);if(data.choices?.[0]?.finish_reason!=='stop')throw new Error('ai_incomplete');
 try{return validateEvidence(JSON.parse(data.choices[0].message.content),input);}catch{throw new Error('ai_response_invalid');}
}
export async function groqTranscribe(audio:Uint8Array,locale:string,key:string,signal:AbortSignal,transport:typeof fetch=fetch){
 inspectWav(audio);const form=new FormData();form.set('file',new Blob([new Uint8Array(audio)],{type:'audio/wav'}),'speech.wav');form.set('model','whisper-large-v3-turbo');form.set('language',locale.split('-')[0]);form.set('response_format','json');
 const response=await transport('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),cache:'no-store'});
 const data=await checked(response);if(typeof data.text!=='string'||!data.text.trim())throw new Error('no_speech');return{textRaw:data.text.slice(0,6000),provider:'groq',model:'whisper-large-v3-turbo'};
}
