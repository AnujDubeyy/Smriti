import { authenticatedClient } from '../../../../lib/auth/access';
import { json } from '../../../../lib/auth/http';
export const dynamic='force-dynamic';
export async function GET() {
 const auth=await authenticatedClient();
 if(!auth.client)return json({error:auth.error},auth.error==='not_configured'?503:401);
 // RLS is authoritative. No preview role or user-supplied membership is trusted.
 const {data,error}=await auth.client.from('patients').select('id,preferred_name,locale').order('created_at').limit(100);
 return error?json({error:'unavailable'},503):json({patients:data});
}
