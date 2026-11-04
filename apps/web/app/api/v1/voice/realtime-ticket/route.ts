import {createHmac} from "node:crypto";
import {z} from "zod";
import {CareError,requireCare,failure} from "../../../../../lib/care";
import {sameOrigin,limitedBody,json} from "../../../../../lib/auth/http";
import {isVoiceLocale} from "../../../../../lib/voice/languages";
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new CareError("forbidden",403);
  const secret=process.env.SMRITI_GATEWAY_SECRET;
  if(!secret||secret.length<32||!process.env.NEXT_PUBLIC_SMRITI_GATEWAY_URL)throw new CareError("gateway_not_configured",503);
  const raw=await limitedBody(request,1500);if(raw===null)throw new CareError("payload_too_large",413);
  const parsed=z.object({session_id:z.uuid()}).strict().safeParse(JSON.parse(raw));
  if(!parsed.success)throw new CareError("invalid_request",400);
  const client=await requireCare();
  const r=await client.rpc("smriti_voice",{operation:"check",input:{session_id:parsed.data.session_id}});
  if(r.error)throw r.error;
  if(!isVoiceLocale(r.data.locale))throw new CareError("unsupported_locale",400);
  const now=Math.floor(Date.now()/1000);
  const body=Buffer.from(JSON.stringify({session_id:parsed.data.session_id,locale:r.data.locale,iat:now,exp:now+45,scope:"voice:stream"})).toString("base64url");
  const mac=createHmac("sha256",secret).update(body).digest("base64url");
  return json({ticket:body+"."+mac,expires_in:45,url:process.env.NEXT_PUBLIC_SMRITI_GATEWAY_URL});
 }catch(e){return failure(e);}
}
