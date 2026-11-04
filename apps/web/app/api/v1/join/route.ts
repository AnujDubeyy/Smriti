import {createHash} from 'node:crypto';
import {z} from 'zod';
import {serverClient} from '../../../../lib/supabase/server';
import {CareError,failure} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';
export const dynamic='force-dynamic';
const claim=z.object({token:z.string().regex(/^[0-9a-f]{64}$/),authorized:z.literal(true)}).strict();
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'forbidden'},403);
 const raw=await limitedBody(request,1000);
 if(!raw)return json({error:'invalid_request'},400);
 try{
  const {token}=claim.parse(JSON.parse(raw));
  const client=await serverClient();if(!client)throw new CareError('not_configured',503);
  let {data:{user}}=await client.auth.getUser();
  if(!user){
   const session=await client.auth.signInAnonymously();
   if(session.error){
    // Do not expose Supabase's raw error message to public clients.
    console.warn('Smriti anonymous sign-in failed',{status:session.error.status,code:session.error.code||'unknown'});
    throw new CareError('anonymous_signin_disabled',503);
   }
   user=session.data.user;
  }
  if(!user?.is_anonymous)throw new CareError('qr_requires_guest',403);
  const hash=createHash('sha256').update(token).digest('hex');
  const {data,error}=await client.rpc('smriti_claim_caretaker_qr',{input:{token_hash:hash,authorized:true}});
  if(error)throw error;
  const response=json({ok:true,patient_id:data.patient_id});
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Referrer-Policy','no-referrer');
  return response;
 }catch(e){return failure(e);}
}
