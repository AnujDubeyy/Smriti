import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';
export const dynamic='force-dynamic';
const schema=z.object({email:z.email().max(254).optional(),password:z.string().min(12).max(128).optional()})
 .strict().refine(x=>!!x.email!==!!x.password);
export async function PATCH(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,1000);if(!raw)throw new CareError('invalid_request',400);
  const input=schema.parse(JSON.parse(raw));
  const client=await requireCare();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)throw new CareError('unauthorized',401);
  const {data:account,error:accountError}=await client.from('app_users').select('onboarding_role').eq('id',user.id).single();
  if(accountError||!['doctor','caregiver'].includes(account?.onboarding_role))throw new CareError('forbidden',403);
  if(input.password && (!user.email_confirmed_at||user.is_anonymous))
   throw new CareError('verify_email_first',409);
  const {data,error}=await client.auth.updateUser(input);
  if(error){
   // Never reveal provider error bodies or account-existence details.
   console.warn('Smriti profile update failed',{status:error.status,code:error.code||'unknown'});
   throw new CareError('credential_update_failed',400);
  }
  return json({ok:true,emailConfirmationPending:!!input.email && !data.user.email_confirmed_at});
 }catch(e){return failure(e);}
}
