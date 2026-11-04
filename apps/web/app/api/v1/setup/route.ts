import {z} from 'zod';
import {requireCare,failure,CareError} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';
const name=z.string().trim().min(1).max(120);
const schema=z.object({name,age:z.coerce.number().int().min(1).max(120),locale:z.enum(['en-IN','hi-IN','mr-IN']),doctor_name:name,doctor_email:z.email().max(254),caregiver_name:name,relationship:name,health_notes:z.string().trim().min(1).max(2000),memories:z.string().trim().min(1).max(1000),authorized:z.literal(true),audio_capture:z.boolean(),transcript_retention:z.boolean(),personalization:z.boolean()}).strict();
export async function POST(request:Request){try{if(!sameOrigin(request))throw new CareError('forbidden',403);const client=await requireCare();const raw=await limitedBody(request,8000);if(raw===null)throw new CareError('payload_too_large',413);const input=schema.parse(JSON.parse(raw));const {data,error}=await client.rpc('smriti_setup',{input});if(error)throw error;return json(data);}catch(e){return failure(e);}}
