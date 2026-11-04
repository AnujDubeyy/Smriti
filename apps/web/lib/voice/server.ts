import 'server-only';
import {gemini,mockAI,type AIInput} from './ai';
export function providerConfig(){const speech=process.env.GNANI_API_KEY_ID;const ai=process.env.GEMINI_API_KEY;const requested=process.env.VOICE_PROVIDER??'auto';
 if(requested==='mock')return{mode:'mock' as const,speech:'',ai:'',model:'mock',voice:''};
 if(!speech||!ai)throw new Error('voice_not_configured');return{mode:'live' as const,speech,ai,model:process.env.GEMINI_MODEL??'gemini-2.5-flash',voice:process.env.GNANI_DEFAULT_VOICE_ID??'Shivani'};}
export async function respond(input:AIInput,signal:AbortSignal){const c=providerConfig();return{result:c.mode==='mock'?mockAI(input):await gemini(input,{key:c.ai,model:c.model},signal),provider:c.mode,model:c.model};}
