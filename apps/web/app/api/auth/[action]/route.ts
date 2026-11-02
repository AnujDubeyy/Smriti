import {z} from 'zod';
import { serverClient } from '../../../../lib/supabase/server';
import { credentials, json, sameOrigin, limitedBody } from '../../../../lib/auth/http';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, {params}: {params: Promise<{action:string}>}) {
 if (!sameOrigin(request)) return json({error:'forbidden'},403);
 const {action}=await params;
 if (!['login','signup','logout','recover','reset'].includes(action)) return json({error:'not_found'},404);
 const client = await serverClient();
 if (!client) return json({error:'not_configured'},503);
 if (action === 'logout') {
  const {error}=await client.auth.signOut({scope:'local'});
  return error ? json({error:'sign_out_failed'},503) : json({ok:true});
 }
 if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({error:'invalid_request'},400);
 const raw=await limitedBody(request);
 if (raw===null) return json({error:'invalid_request'},413);
 let input;try {input=(action==='recover'?z.object({email:z.email().max(254)}).strict():action==='reset'?z.object({password:z.string().min(12).max(128)}).strict():credentials).safeParse(JSON.parse(raw));}catch {return json({error:'invalid_request'},400);}
 if (!input.success) return json({error:'invalid_request'},400);
 if(action==='recover'&&'email'in input.data){
 const appUrl=process.env.SMRITI_APP_URL;if(!appUrl)return json({error:'not_configured'},503);
 await client.auth.resetPasswordForEmail(input.data.email,{redirectTo:new URL('/auth/callback?flow=recovery',appUrl).href});return json({ok:true});
 }
 if(action==='reset'&&'password'in input.data){const {data,error}=await client.auth.getUser();if(error||!data.user)return json({error:'unauthorized'},401);const result=await client.auth.updateUser({password:input.data.password});return result.error?json({error:'reset_failed'},400):json({ok:true});}
 if(!('email'in input.data)||!('password'in input.data)||typeof input.data.password!=='string')return json({error:'invalid_request'},400);
 const authInput=credentials.safeParse(input.data);if(!authInput.success)return json({error:'invalid_request'},400);
 if (action==='login') {
  const {error}=await client.auth.signInWithPassword(authInput.data);
  return error ? json({error:'sign_in_failed'},401) : json({ok:true});
 }
 // No role, verification status or scopes are accepted from signup input.
 const appUrl=process.env.SMRITI_APP_URL;
 if (!appUrl) return json({error:'not_configured'},503);
 const {error}=await client.auth.signUp({...authInput.data,options:{emailRedirectTo:new URL('/auth/callback',appUrl).href}});
 return error ? json({error:'sign_up_failed'},400) : json({ok:true,confirmationRequired:true});
}
