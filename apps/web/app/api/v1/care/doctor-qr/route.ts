import {randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
const input=z.object({
 patient_name:z.string().trim().min(2).max(120),caretaker_name:z.string().trim().min(2).max(120),
 relationship:z.string().trim().min(2).max(100),
 date_of_birth:z.iso.date(),
 sex:z.enum(['female','male','intersex','prefer_not_to_say']),
 family_count:z.number().int().min(0).max(50),
 locale:z.enum(['en-IN','hi-IN','mr-IN']),
 support_notes:z.string().trim().max(2000).default('')
}).strict();
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const client=await requireCare();
  const raw=await limitedBody(request,6000);if(!raw)throw new CareError('invalid_request',400);
  const parsed=input.parse(JSON.parse(raw));
  const token=randomBytes(32).toString('hex');
  const token_hash=createHash('sha256').update(token).digest('hex');
  const {data,error}=await client.rpc('smriti_issue_doctor_qr',{input:{...parsed,token_hash}});
  if(error)throw error;
  const origin=process.env.SMRITI_APP_URL;
  if(!origin||new URL(origin).protocol!=='https:')throw new CareError('not_configured',503);
  // URL fragment is never sent to Vercel, analytics, logs, or external image providers.
  const url=new URL('/join',origin);url.hash=token;
  const response=json({...data,url:url.href});
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Referrer-Policy','no-referrer');
  return response;
 }catch(e){return failure(e);}
}
