import { authenticatedClient } from '../../../../../lib/auth/access';
import { json,uuid } from '../../../../../lib/auth/http';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await authenticatedClient();
 if(!auth.client)return json({error:auth.error},auth.error==='not_configured'?503:401);
 const {id}=await params;if(!uuid.safeParse(id).success)return json({error:'invalid_request'},400);
 const {data,error}=await auth.client.from('patients').select('id,preferred_name,locale').eq('id',id).maybeSingle();
 if(error)return json({error:'unavailable'},503);
 // Same denial for missing and unauthorized IDs, with no patient data in the body.
 return data?json({patient:data}):json({error:'forbidden'},403);
}
