import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
const schema=z.object({email:z.email().max(254).optional(),password:z.string().min(12).max(128).optional(),resend:z.literal(true).optional()})
 .strict().refine(x=>(!!x.email!==!!x.password)&&(!x.resend||!!x.email));
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
  const appUrl=process.env.SMRITI_APP_URL;
  if(input.email&&!appUrl)throw new CareError('not_configured',503);
  const options=input.email?{emailRedirectTo:new URL('/auth/callback?flow=credentials',appUrl).href}:undefined;
  const {error}=input.resend&&input.email
   ?await client.auth.resend({type:'email_change',email:input.email,options})
   :await client.auth.updateUser(input.password?{password:input.password}:{email:input.email},options);
  if(error){
   if(error.status===429)throw new CareError('email_rate_limited',429);
   if(error.code==='email_address_not_authorized'||(error.status??400)>=500)throw new CareError('email_delivery_unavailable',503);
   throw new CareError('credential_update_failed',400);
  }
  return json({ok:true});
 }catch(e){return failure(e);}
}
