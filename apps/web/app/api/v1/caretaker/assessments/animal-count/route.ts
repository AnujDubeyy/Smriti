import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../../../lib/care';
import {sameOrigin,limitedBody,json} from '../../../../../../lib/auth/http';
import {countAnimals} from '../../../../../../lib/voice/groq';

export const dynamic='force-dynamic';
export const maxDuration=20;
const schema=z.object({patient_id:z.uuid(),assignment_id:z.uuid(),locale:z.enum(['en-IN','hi-IN','mr-IN']),transcript:z.string().trim().min(1).max(1500)}).strict();

export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,5000);if(raw===null)throw new CareError('payload_too_large',413);
  const input=schema.parse(JSON.parse(raw));
  const client=await requireCare();
  const {data,error}=await client.rpc('smriti_caretaker_assessments',{operation:'list',input:{patient_id:input.patient_id}});
  if(error)throw error;
  const assignment=Array.isArray(data)?data.find((item:{id?:string;status?:string;instrument_code?:string})=>item.id===input.assignment_id&&item.status==='assigned'&&item.instrument_code==='smriti_category_fluency_v1'):null;
  if(!assignment)throw new CareError('assessment_already_completed',409);
  const key=process.env.GROQ_API_KEY;if(!key)throw new CareError('voice_not_configured',503);
  return json(await countAnimals(input.transcript,input.locale,key,request.signal));
 }catch(error){return failure(error);}
}
