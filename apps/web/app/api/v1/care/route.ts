import {z} from 'zod';
import {randomBytes,createHash} from 'node:crypto';
import {requireCare,failure,CareError} from '../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../lib/auth/http';
const pid=z.uuid();
const requestSchema=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('create_patient'),name:z.string().trim().min(1).max(120),locale:z.enum(['en-IN','hi-IN','mr-IN']),synthetic:z.literal(true)}).strict(),
 z.object({operation:z.literal('verification_request'),kind:z.enum(['clinician','representative'])}).strict(),
 z.object({operation:z.literal('accept_invite'),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
 z.object({operation:z.literal('workspace'),patient_id:pid}).strict(),
 z.object({operation:z.literal('leave'),patient_id:pid}).strict(),
 z.object({operation:z.literal('consent'),patient_id:pid,purpose:z.enum(['care_relationship','life_book','personalization','audio_capture','transcript_retention','clinician_sharing','notifications','research_export']),enabled:z.boolean()}).strict(),
 z.object({operation:z.literal('invite'),patient_id:pid,email:z.email().max(254),role:z.enum(['caregiver','clinician'])}).strict(),
 z.object({operation:z.literal('revoke_member'),patient_id:pid,id:pid}).strict(),
 z.object({operation:z.literal('revoke_invite'),patient_id:pid,id:pid}).strict(),
]);
export async function POST(request:Request){try{
 if(!sameOrigin(request))throw new CareError('forbidden',403);
 const client=await requireCare();const raw=await limitedBody(request,6000);if(raw===null)throw new CareError('payload_too_large',413);
 const parsed=requestSchema.safeParse(JSON.parse(raw));if(!parsed.success)throw new CareError('invalid_request');
 const {operation,...input}=parsed.data;let token:string|undefined;const data:Record<string,unknown>={...input};
 if(operation==='invite'){token=randomBytes(32).toString('hex');data.hash=createHash('sha256').update(token).digest('hex');}
 if(operation==='accept_invite'&&'token'in input){data.hash=createHash('sha256').update(input.token).digest('hex');delete data.token;}
 const result=await client.rpc('smriti_command',{operation,input:data});if(result.error)throw result.error;
 // Token returned once to the inviter. It is never stored in plaintext or emailed automatically.
 return json({...result.data,...(token?{token}: {})});
 }catch(e){return failure(e);}}
