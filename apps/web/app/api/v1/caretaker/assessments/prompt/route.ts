import {z} from 'zod';
import {requireCare,failure,CareError} from '../../../../../../lib/care';
import {sameOrigin,limitedBody} from '../../../../../../lib/auth/http';
import {activityPrompt,isActivityCode} from '../../../../../../lib/assessment-activities';
import {synthesize} from '../../../../../../lib/voice/gnani';

export const dynamic='force-dynamic';
export const maxDuration=30;
const schema=z.object({patient_id:z.uuid(),assignment_id:z.uuid(),locale:z.enum(['en-IN','hi-IN','mr-IN'])}).strict();

export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,1200);if(raw===null)throw new CareError('payload_too_large',413);
  const input=schema.parse(JSON.parse(raw));const client=await requireCare();
  const {data,error}=await client.rpc('smriti_caretaker_assessments',{operation:'list',input:{patient_id:input.patient_id}});
  if(error)throw error;
  const assignment=Array.isArray(data)?data.find((item:{id?:string;status?:string})=>item.id===input.assignment_id&&item.status==='assigned'):null;
  if(!assignment||!isActivityCode(assignment.instrument_code))throw new CareError('assessment_already_completed',409);
  const key=process.env.GNANI_API_KEY_ID;if(!key)throw new CareError('voice_not_configured',503);
  const audio=await synthesize(activityPrompt(assignment.instrument_code,input.locale),input.locale,process.env.GNANI_DEFAULT_VOICE_ID??'Kaveri',key,request.signal);
  return new Response(new Blob([new Uint8Array(audio)],{type:'audio/wav'}),{status:200,headers:{'Content-Type':'audio/wav','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return failure(error);}
}
