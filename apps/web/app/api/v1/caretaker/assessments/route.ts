import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
const schema=z.object({
 patient_id:z.uuid(),assignment_id:z.uuid(),
 response_text:z.string().trim().min(1).max(1500),
 caregiver_observation:z.string().trim().max(1200).default('')
}).strict();
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,4300);
  if(!raw)throw new CareError('invalid_request',400);
  const input=schema.parse(JSON.parse(raw));
  const client=await requireCare();
  const {data,error}=await client.rpc('smriti_caretaker_assessments',{
   operation:'submit',input:{
    patient_id:input.patient_id,assignment_id:input.assignment_id,
    responses:{
     response_text:input.response_text,
     caregiver_observation:input.caregiver_observation
    }
   }
  });
  if(error)throw error;
  return json(data);
 }catch(e){return failure(e);}
}
