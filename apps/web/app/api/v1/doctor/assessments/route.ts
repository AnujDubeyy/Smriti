import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
import {isAssessmentCode} from '../../../../../lib/assessment-activities';
export const dynamic='force-dynamic';
const uuid=z.uuid();
const create=z.object({
 patient_id:uuid,instrument_code:z.string(),
 due_date:z.iso.date().nullable().optional()
}).strict();
export async function GET(request:Request){
 try{
  const id=new URL(request.url).searchParams.get('patient_id');
  const patientId=uuid.parse(id);
  const client=await requireCare();
  const {data,error}=await client.rpc('smriti_doctor_assessments',{operation:'list',input:{patient_id:patientId}});
  if(error)throw error;
  return json({assignments:data||[]});
 }catch(e){return failure(e);}
}
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,1200);
  if(!raw)throw new CareError('invalid_request',400);
  const input=create.parse(JSON.parse(raw));
  if(!isAssessmentCode(input.instrument_code))throw new CareError('invalid_assessment',400);
  const client=await requireCare();
  const {data,error}=await client.rpc('smriti_doctor_assessments',{
   operation:'assign',input:{
    patient_id:input.patient_id,instrument_code:input.instrument_code,
    ...(input.due_date?{due_date:input.due_date}:{})
   }
  });
  if(error)throw error;
  return json(data,201);
 }catch(e){return failure(e);}
}
