import { NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase/server';
export async function GET(request:Request) {
 const code=new URL(request.url).searchParams.get('code'); const client=await serverClient();
 let success=false;
 if(code && client) { const {error}=await client.auth.exchangeCodeForSession(code);success=!error; }
 const response=NextResponse.redirect(new URL(success?(new URL(request.url).searchParams.get('flow')==='recovery'?'/reset-password':'/patients/select'):'/login?confirmation=failed',request.url));
 response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
