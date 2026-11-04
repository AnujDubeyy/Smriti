import 'server-only';
import {gemini,type AIInput} from './ai';
import {groq} from './groq';
export function providerConfig(){
 const groqKey=process.env.GROQ_API_KEY;
 const aiProvider=process.env.LLM_PROVIDER??(groqKey?'groq':'gemini');
 const ai=aiProvider==='groq'?groqKey:process.env.GEMINI_API_KEY;
 const speechProvider=process.env.STT_PROVIDER??(groqKey?'groq':'gnani');
 const speech=speechProvider==='groq'?groqKey:process.env.GNANI_API_KEY_ID;
 if(!ai||!speech)throw new Error('voice_not_configured');
 return{mode:'live' as const,speech,ai,aiProvider,speechProvider,ttsKey:process.env.GNANI_API_KEY_ID??'',model:aiProvider==='groq'?(process.env.GROQ_MODEL??'llama-3.3-70b-versatile'):(process.env.GEMINI_MODEL??'gemini-2.5-flash'),voice:process.env.GNANI_DEFAULT_VOICE_ID??'Shivani'};
}
export async function respond(input:AIInput,signal:AbortSignal){const c=providerConfig();return{result:await (c.aiProvider==='groq'?groq:gemini)(input,{key:c.ai,model:c.model},signal),provider:c.aiProvider,model:c.model};}
