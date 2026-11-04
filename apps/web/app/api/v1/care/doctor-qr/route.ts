import {randomBytes,createHash} from 'node:crypto';
import {intakeSchema} from '../../../../../lib/clinical-intake';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const client=await requireCare();
  const raw=await limitedBody(request,10000);if(!raw)throw new CareError('invalid_request',400);
  const parsed=intakeSchema.parse(JSON.parse(raw));
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
