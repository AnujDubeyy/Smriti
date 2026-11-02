import { z } from 'zod';
export const credentials = z.object({ email: z.email().max(254), password: z.string().min(12).max(128) }).strict();
export const uuid = z.uuid();
export function json(body: unknown, status = 200) {
 return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Pragma': 'no-cache', 'Referrer-Policy':'no-referrer' } });
}
export function sameOrigin(request: Request) {
 const origin = request.headers.get('origin');
 return !!origin && origin === new URL(request.url).origin;
}
export async function limitedBody(request:Request,limit=4096):Promise<string|null> {
 if(!request.body)return '';
 const reader=request.body.getReader();const decoder=new TextDecoder();let size=0;let text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return null;}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}
 finally{reader.releaseLock();}
}
