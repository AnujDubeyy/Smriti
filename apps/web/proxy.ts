import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from './lib/auth/config';
export async function proxy(request: NextRequest) {
 let response = NextResponse.next({ request });
 const config = authConfig();
 if (config) {
  const client = createServerClient(config.url, config.key, {
   cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
   cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values, headers) => {
     values.forEach(({name,value})=>request.cookies.set(name,value));
     response = NextResponse.next({request});
     values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
     Object.entries(headers ?? {}).forEach(([name,value])=>response.headers.set(name,value));
    },
   },
  });
  await client.auth.getClaims();
 }
 response.headers.set('Cache-Control','private, no-store, max-age=0');
 response.headers.set('Pragma','no-cache');
 response.headers.set('Referrer-Policy','no-referrer');
 return response;
}
export const config = { matcher: ['/login','/signup','/patients/:path*','/permissions/:path*','/auth/:path*','/api/:path*'] };
