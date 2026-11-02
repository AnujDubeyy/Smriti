import 'server-only';
import { serverClient } from '../supabase/server';
export async function authenticatedClient() {
 const client=await serverClient();
 if(!client) return {client:null,user:null,error:'not_configured' as const};
 const {data,error}=await client.auth.getUser();
 if(error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) return {client:null,user:null,error:'unauthorized' as const};
 return {client,user:data.user,error:null};
}
