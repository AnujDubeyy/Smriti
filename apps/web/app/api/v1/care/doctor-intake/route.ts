import {z} from 'zod';
import {clinicalFields,dementiaDiagnoses} from '../../../../../lib/clinical-intake';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
const schema=z.object({patient_id:z.uuid(),clinical_intake:clinicalFields}).strict()
 .superRefine((v,ctx)=>{
  const p=v.clinical_intake;
  if(p.diagnoses.includes('other')&&!p.other_condition)
   ctx.addIssue({code:'custom',path:['clinical_intake','other_condition'],message:'Name the condition'});
  if(p.diagnoses.includes('under_evaluation')&&p.diagnoses.length>1)
   ctx.addIssue({code:'custom',path:['clinical_intake','diagnoses'],message:'Use under evaluation alone'});
  const dementia=p.diagnoses.some(x=>(dementiaDiagnoses as readonly string[]).includes(x));
  if(p.dementia_stage!=='not_assessed'&&(!dementia||p.diagnosis_status!=='confirmed_by_clinician'))
   ctx.addIssue({code:'custom',path:['clinical_intake','dementia_stage'],message:'Stage requires clinician-documented dementia'});
 });
export async function PATCH(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,8000);if(!raw)throw new CareError('invalid_request',400);
  const data=schema.parse(JSON.parse(raw));
  const client=await requireCare();
  const {data:result,error}=await client.rpc('smriti_update_doctor_intake',{input:data});
  if(error)throw error;
  return json(result);
 }catch(e){return failure(e);}
}
