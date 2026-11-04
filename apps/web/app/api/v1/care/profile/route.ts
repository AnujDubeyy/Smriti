import {z} from 'zod';
import {requireCare,CareError,failure} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';
export const dynamic='force-dynamic';
const schema=z.object({
 patient_id:z.uuid(),patient_name:z.string().trim().min(2).max(120),
 caretaker_name:z.string().trim().min(2).max(120),relationship:z.string().trim().min(2).max(100),
 date_of_birth:z.iso.date(),sex:z.enum(['female','male','intersex','prefer_not_to_say']),
 family_count:z.number().int().min(0).max(50),support_notes:z.string().trim().max(2000)
}).strict();
export async function PATCH(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,7000);if(!raw)throw new CareError('invalid_request',400);
  const data=schema.parse(JSON.parse(raw));
  const client=await requireCare();
  const {data:result,error}=await client.rpc('smriti_update_caretaker_profile',{input:data});
  if(error)throw error;
  return json(result);
 }catch(e){return failure(e);}
}
