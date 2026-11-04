/**
 * Voice response failover. Models are sequential, with bounded per-attempt
 * latency. Never retry policy/consent/authentication checks or fabricate a reply.
 * This module deliberately has no network or patient-data logging.
 */
export type ModelProvider='groq'|'gemini';
export type Candidate={provider:ModelProvider;model:string;key:string};
export type ModelFailure='ai_auth'|'ai_model_unavailable'|'ai_request_rejected'|'ai_response_invalid'|'ai_incomplete'|'ai_unavailable'|'provider_timeout'|'provider_rate_limit';
const retryable=new Set<ModelFailure>([
 'ai_auth','ai_model_unavailable','ai_request_rejected',
 'ai_response_invalid','ai_incomplete','ai_unavailable',
 'provider_timeout','provider_rate_limit'
]);
export const GROQ_FALLBACK_MODELS=[
 'openai/gpt-oss-120b',
 'openai/gpt-oss-20b',
 'qwen/qwen3.8-27b'
] as const;
export const GEMINI_FALLBACK_MODELS=[
 'gemini-3.5-flash-lite',
 'gemini-3.8-flash'
] as const;
export function createModelChain(config:{
 primary:Candidate;
 groqKey?:string;
 geminiKey?:string;
}):Candidate[]{
 const {primary,groqKey,geminiKey}=config;
 const candidates:Candidate[]=[primary];
 if(groqKey)for(const model of GROQ_FALLBACK_MODELS)candidates.push({provider:'groq',model,key:groqKey});
 if(geminiKey)for(const model of GEMINI_FALLBACK_MODELS)candidates.push({provider:'gemini',model,key:geminiKey});
 // A configured primary may also be a Gemini model. Keep it first; remove duplicates.
 const visited=new Set<string>();
 return candidates.filter(c=>{
  const id=c.provider+':'+c.model;
  if(visited.has(id))return false;
  visited.add(id);return true;
 }).slice(0,5);
}
function failureCode(error:unknown):string{
 if(error instanceof Error){
  if(error.name==='TimeoutError')return 'provider_timeout';
  if(error.name==='TypeError')return 'ai_unavailable';
  return error.message;
 }
 return 'ai_unavailable';
}
export type ModelAttemptStatus={provider:ModelProvider;model:string;error:string};
export async function runModelChain<Result>(
 candidates:Candidate[],
 signal:AbortSignal,
 invoke:(candidate:Candidate,signal:AbortSignal)=>Promise<Result>,
 observe?:(status:ModelAttemptStatus)=>void,
 perAttemptTimeoutMs=9000
):Promise<{result:Result;provider:ModelProvider;model:string}>{
 if(!candidates.length)throw new Error('voice_not_configured');
 if(!Number.isFinite(perAttemptTimeoutMs)||perAttemptTimeoutMs<100)throw new Error('invalid_timeout');
 let lastError:unknown=new Error('ai_unavailable');
 const blockedProviders=new Set<ModelProvider>();
 for(const candidate of candidates){
  if(signal.aborted)throw new Error('call_cancelled');
  if(blockedProviders.has(candidate.provider))continue;
  const timeout=AbortSignal.timeout(perAttemptTimeoutMs);
  const combined=AbortSignal.any([signal,timeout]);
  try{
   const result=await invoke(candidate,combined);
   if(signal.aborted)throw new Error('call_cancelled');
   return {result,provider:candidate.provider,model:candidate.model};
  }catch(error){
   if(signal.aborted)throw new Error('call_cancelled');
   const code=timeout.aborted?'provider_timeout':failureCode(error);
   if(!retryable.has(code as ModelFailure))throw error;
   if(code==='ai_auth')blockedProviders.add(candidate.provider);
   lastError=new Error(code);
   observe?.({provider:candidate.provider,model:candidate.model,error:code});
  }
 }
 throw lastError;
}
