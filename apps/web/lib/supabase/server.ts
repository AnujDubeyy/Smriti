import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { authConfig } from '../auth/config';
export async function serverClient() {
 const config = authConfig();
 if (!config) return null;
 const store = await cookies();
 return createServerClient(config.url, config.key, {
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
  cookies: {
   getAll: () => store.getAll(),
   setAll: values => { try { values.forEach(({name,value,options})=>store.set(name,value,options)); } catch { /* Read-only Server Component; proxy owns refresh cookies. */ } },
  },
 });
}
