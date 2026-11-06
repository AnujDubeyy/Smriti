import {z} from 'zod';
import {authenticatedClient} from '../../../../../lib/auth/access';
import {requireCare,CareError,failure} from '../../../../../lib/care';
import {json,sameOrigin,limitedBody} from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
const schema=z.object({
 patient_id:z.uuid(),assignment_id:z.uuid(),task_score:z.number().int().min(0).max(200).optional(),
 response_text:z.string().trim().min(1).max(1500),
 caregiver_observation:z.string().trim().max(1200).default('')
}).strict();
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError('forbidden',403);
  const raw=await limitedBody(request,14000);
  if(!raw)throw new CareError('invalid_request',400);
  const input=schema.parse(JSON.parse(raw));
  const client=await requireCare();
  const {data,error}=await client.rpc('smriti_caretaker_assessments',{
   operation:'submit',input:{
    patient_id:input.patient_id,assignment_id:input.assignment_id,
    responses:{
     task_score:input.task_score,response_text:input.response_text,
     caregiver_observation:input.caregiver_observation
    }
   }
  });
  if(error)throw error;
  return json(data);
 }catch(e){return failure(e);}
}

export async function GET(request:Request){try{
 const notifications=new URL(request.url).searchParams.has('notifications');
 const {client,user}=await authenticatedClient();if(!client||!user)throw new CareError('unauthorized',401);
 const {data:patient,error:patientError}=await client.from('patients').select('id').eq('linked_user_id',user.id).eq('synthetic',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(patientError)throw patientError;if(!patient)return json({assignments:[]});
 const [activities,workspace,password]=await Promise.all([
  client.rpc('smriti_caretaker_assessments',{operation:'list',input:{patient_id:patient.id}}),
  notifications?client.rpc('smriti_command',{operation:'workspace',input:{patient_id:patient.id}}):Promise.resolve({data:null,error:null}),
  notifications&&!user.is_anonymous?client.rpc('smriti_has_login_password'):Promise.resolve({data:false,error:null})
 ]);
 if(!notifications){if(activities.error)throw activities.error;return json({assignments:activities.data||[]});}
 const reminders=[];
 if(user.is_anonymous||password.data===false)reminders.push({id:'credentials',title:'Finish setting up your login',href:'/profile#login-details',detail:user.is_anonymous?'Verify an email and set a password.':'Set a password for your verified email.'});
 const consent=workspace.data?.consents||[];
 if(!workspace.error&&!consent.some((c:{purpose:string;active:boolean})=>c.purpose==='clinician_sharing'&&c.active))
  reminders.push({id:'sharing',title:'Review doctor sharing',href:'/permissions?patient='+patient.id,detail:'Choose whether your doctor can assign activities and review responses.'});
 return json({activitiesUnavailable:!!activities.error,assignments:(activities.data||[]).filter((a:{status:string})=>a.status==='assigned').map(({id,status,instrument_code,due_date}:{id:string;status:string;instrument_code:string;due_date:string|null})=>({id,status,instrument_code,due_date})),reminders});
}catch(e){return failure(e);}}
