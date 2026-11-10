import {z} from 'zod';
import {inspectWav} from './audio.ts';
import {boundedResponse} from './ai.ts';
import {isVoiceLocale} from './languages.ts';
const transcript=z.object({success:z.literal(true),transcript:z.string().max(6000),model:z.string().optional(),request_id:z.string().optional(),truncated:z.boolean().optional()});
export async function transcribe(audio:Uint8Array,locale:string,key:string,signal:AbortSignal,transport:typeof fetch=fetch){
 inspectWav(audio);if(!isVoiceLocale(locale))throw new Error('unsupported_locale');
 const form=new FormData();form.set('audio_file',new Blob([new Uint8Array(audio)],{type:'audio/wav'}),'clip.wav');form.set('model','prisma-v3.0');form.set('language_code',locale);form.set('format','verbatim');
 const response=await transport('https://api.vachana.ai/stt/v3',{method:'POST',headers:{'X-API-Key-ID':key},body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),cache:'no-store'});
 if(!response.ok)throw new Error(response.status===429?'provider_rate_limit':'stt_unavailable');
 const parsed=transcript.parse(JSON.parse(new TextDecoder().decode(await boundedResponse(response,100000))));
 if(parsed.truncated||parsed.model&&parsed.model!=='prisma-v3.0')throw new Error('stt_incomplete');
 if(!parsed.transcript.trim())throw new Error('no_speech');return{textRaw:parsed.transcript,provider:'gnani',model:parsed.model??'prisma-v3.0'};
}
const TIMBRE_V3_VOICES=new Set(['Vasudha','Chetana','Kalpana','Tarika','Harshad','Avinash','Prakash','Shubham','Devansh','Lakshmi','Yashraj','Riyaa']);
export async function synthesize(text:string,locale:string,voice:string,key:string,signal:AbortSignal,transport:typeof fetch=fetch){
 if(!text.trim()||text.length>1200||/[<>]/.test(text)||!voice||!isVoiceLocale(locale))throw new Error('invalid_tts');
 const model=TIMBRE_V3_VOICES.has(voice)?'timbre-v3.0':'timbre-v2.5';
 const response=await transport('https://api.vachana.ai/api/v1/tts/inference',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key-ID':key},body:JSON.stringify({text,model,voice,language:locale,speed:0.85,audio_config:{encoding:'linear_pcm',container:'wav',sample_rate:16000,num_channels:1,sample_width:2}}),signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),cache:'no-store'});
 if(!response.ok)throw new Error(response.status===429?'provider_rate_limit':'tts_unavailable');
 const bytes=await boundedResponse(response,3000000);if(String.fromCharCode(...bytes.slice(0,4))!=='RIFF'||String.fromCharCode(...bytes.slice(8,12))!=='WAVE')throw new Error('invalid_tts_audio');
 return bytes;
}
