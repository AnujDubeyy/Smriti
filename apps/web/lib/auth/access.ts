import 'server-only';
import { serverClient } from '../supabase/server';
export async function authenticatedClient() {
 const client=await serverClient();
 if(!client) return {client:null,user:null,error:'not_configured' as const};
 const {data,error}=await client.auth.getUser();
 if(error || !data.user)return {client:null,user:null,error:'unauthorized' as const};
 if(data.user.is_anonymous){
  // An anonymous session is valid only after an unexpired one-use QR has been
  // claimed into an active fictional-patient caregiver relationship.
  const {data:valid,error:qrError}=await client.rpc('smriti_qr_session_ok');
  if(qrError||valid!==true)return {client:null,user:null,error:'unauthorized' as const};
 }else if(!data.user.email_confirmed_at)return {client:null,user:null,error:'unauthorized' as const};
 return {client,user:data.user,error:null};
}
