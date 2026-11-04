import 'server-only';
import {ZodError} from 'zod';
import {authenticatedClient} from './auth/access';
import {json} from './auth/http';
export async function requireCare(){const a=await authenticatedClient();if(!a.client)throw new CareError(a.error==='not_configured'?'not_configured':'unauthorized',a.error==='not_configured'?503:401);return a.client;}
export class CareError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function failure(error:unknown){
 if(error instanceof ZodError||error instanceof SyntaxError)return json({error:'invalid_request'},400);
 if(error instanceof CareError)return json({error:error.message},error.status);
 const code=typeof error==='object'&&error&&'code'in error?String(error.code):'';
 const message=error instanceof Error?error.message:typeof error==='object'&&error&&'message'in error?String(error.message):'';
 const safe=['no_speech','audio_size','audio_format','audio_duration','invalid_audio','unsupported_locale','provider_rate_limit','provider_timeout','provider_quota_exhausted','ai_auth','ai_model_unavailable','ai_request_rejected','ai_response_invalid','ai_incomplete','role_already_selected','caregiver_role_required','invalid_birth_date','invalid_family_count','voice_not_configured','ai_unavailable','stt_unavailable','tts_unavailable','unsupported_evidence','unsafe_output','duplicate_turn','idempotency_conflict','relationship_exists','synthetic_only','consent_required','session_inactive','clinician_not_verified','daily_limit','rate_limited','doctor_only','qr_expired_or_used','qr_requires_guest','qr_account_already_joined','anonymous_signin_disabled','sharing_required','invalid_assessment','invalid_due_date','assessment_already_assigned','assessment_already_completed','invalid_assessment_response'];
 if(code==='42501')return json({error:safe.includes(message)?message:'forbidden'},403);
 if(code==='23505')return json({error:safe.includes(message)?message:'conflict'},409);
 if(safe.includes(message))return json({error:message},message.includes('limit')?429:message.includes('duplicate')||message.includes('conflict')?409:400);
 if(message.includes('abort')||message.includes('timeout')||error instanceof DOMException)return json({error:'request_cancelled_or_timeout'},408);
 return json({error:'temporarily_unavailable'},503);
}
