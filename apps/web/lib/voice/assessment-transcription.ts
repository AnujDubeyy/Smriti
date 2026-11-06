import {transcribe} from './gnani.ts';
import {groqTranscribe} from './groq.ts';

type Transcription={textRaw:string;provider:string;model:string};
type Transcriber=(audio:Uint8Array,locale:string,key:string,signal:AbortSignal)=>Promise<Transcription>;

export async function transcribeAssessment(
 audio:Uint8Array,
 locale:string,
 gnaniKey:string|undefined,
 groqKey:string|undefined,
 signal:AbortSignal,
 adapters:{gnani:Transcriber;groq:Transcriber}={gnani:transcribe,groq:groqTranscribe}
){
 if(gnaniKey){
  try{return await adapters.gnani(audio,locale,gnaniKey,signal);}
  catch(error){
   if(signal.aborted||!groqKey)throw error;
   const code=error instanceof Error&&/^(provider_rate_limit|provider_timeout|no_speech|stt_unavailable|stt_incomplete|ai_unavailable)$/.test(error.message)?error.message:'stt_unavailable';
   console.warn('Smriti assessment transcription fallback',{from:'gnani',to:'groq',reason:code});
  }
 }
 if(!groqKey)throw new Error('voice_not_configured');
 return adapters.groq(audio,locale,groqKey,signal);
}
