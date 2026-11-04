import 'server-only';
import {gemini,type AIInput} from './ai';
import {groq} from './groq';
import {createModelChain,runModelChain} from './fallback';
export function providerConfig(){
 const groqKey=process.env.GROQ_API_KEY;
 const aiProvider=process.env.LLM_PROVIDER??(groqKey?'groq':'gemini');
 const ai=aiProvider==='groq'?groqKey:process.env.GEMINI_API_KEY;
 const speechProvider=process.env.STT_PROVIDER??(groqKey?'groq':'gnani');
 const speech=speechProvider==='groq'?groqKey:process.env.GNANI_API_KEY_ID;
 if(!ai||!speech)throw new Error('voice_not_configured');
 return{mode:'live' as const,speech,ai,aiProvider,speechProvider,ttsKey:process.env.GNANI_API_KEY_ID??'',model:aiProvider==='groq'?(process.env.GROQ_MODEL??'openai/gpt-oss-120b'):(process.env.GEMINI_MODEL??'gemini-2.5-flash'),voice:process.env.GNANI_DEFAULT_VOICE_ID??'Shivani'};
}
export async function respond(input:AIInput,signal:AbortSignal){
 const config=providerConfig();
 const chain=createModelChain({
  primary:{provider:config.aiProvider==='groq'?'groq':'gemini',model:config.model,key:config.ai},
  groqKey:process.env.GROQ_API_KEY,
  geminiKey:process.env.GEMINI_API_KEY
 });
 // All candidates receive the same approved context and all provider adapters
 // must pass validateEvidence before a reply can reach the caller or be stored.
 // Attempts stop after their per-model deadline; they never run in parallel.
 const completion=await runModelChain(chain,signal,
  (candidate,attemptSignal)=>candidate.provider==='groq'
   ?groq(input,{key:candidate.key,model:candidate.model},attemptSignal)
   :gemini(input,{key:candidate.key,model:candidate.model},attemptSignal),
  ({provider,model,error})=>{
   // Metadata only. Never log transcript, patient profile, credentials, or prompts.
   console.warn('Smriti voice model fallback',{provider,model,error});
  },9000);
 return completion;
}
