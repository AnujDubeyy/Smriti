/** Secure, consent-ticketed Prisma streaming gateway for synthetic Smriti calls. */
import http from "node:http";
import {createHmac,timingSafeEqual} from "node:crypto";
import {WebSocket,WebSocketServer} from "ws";
const PORT=Number(process.env.PORT||8080);
const KEY=process.env.GNANI_API_KEY_ID||process.env.GNANI_API_KEY;
const SECRET=process.env.SMRITI_GATEWAY_SECRET;
const ORIGINS=(process.env.SMRITI_ALLOWED_ORIGIN||"").split(",").map(x=>x.trim()).filter(Boolean);
if(!KEY||!SECRET||SECRET.length<32||!ORIGINS.length)throw Error("Set GNANI_API_KEY_ID, SMRITI_GATEWAY_SECRET (32+ characters) and SMRITI_ALLOWED_ORIGIN");
const LANG=new Set(["en-IN","hi-IN","mr-IN","bn-IN","gu-IN","pa-IN","kn-IN","te-IN","ta-IN","ml-IN"]);
function verify(token){
 if(!token||token.length>2048)return null;
 const [body,mac,extra]=token.split(".");if(!body||!mac||extra)return null;
 const expected=createHmac("sha256",SECRET).update(body).digest();
 let actual;try{actual=Buffer.from(mac,"base64url");}catch{return null;}
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 let data;try{data=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));}catch{return null;}
 const now=Math.floor(Date.now()/1000);
 if(data.scope!=="voice:stream"||!LANG.has(data.locale)||!/^[a-f0-9-]{36}$/i.test(data.session_id||"")
  ||!Number.isFinite(data.iat)||data.iat<now-90||data.iat>now+10
  ||!Number.isFinite(data.exp)||data.exp<now||data.exp>now+90)return null;
 return data;
}
const httpServer=http.createServer((req,res)=>{
 if(req.method==="GET"&&req.url==="/health"){
  res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});
  res.end(JSON.stringify({ok:true,service:"smriti-gnani-stream"}));return;
 }
 res.writeHead(404).end();
});
const wss=new WebSocketServer({noServer:true,maxPayload:4096,handleProtocols:p=>p.has("smriti.v1")?"smriti.v1":false});
httpServer.on("upgrade",(req,socket,head)=>{
 if(!ORIGINS.includes(req.headers.origin||"")){socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");socket.destroy();return;}
 const pathname=new URL(req.url||"/", "http://localhost").pathname;
 if(pathname!=="/ws"){socket.destroy();return;}
 const protocols=(req.headers["sec-websocket-protocol"]||"").split(",").map(x=>x.trim());
 const token=protocols.find(x=>x.startsWith("ticket."));
 const claim=verify(token?.slice(7));
 if(!protocols.includes("smriti.v1")||!claim){socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit("connection",ws,req,claim));
});
wss.on("connection",(client,_req,claim)=>{
 const upstream=new WebSocket("wss://api.vachana.ai/stt/v3/stream",{headers:{
  "x-api-key-id":KEY,"language_code":claim.locale,"model":"prisma-v3.0",
  "format":"verbatim","x-sample-rate":"16000","x-idle-timeout-sec":"120",
  "x-min-silence-ms":"500","x-min-speech-ms":"180","x-max-speech-s":"30"}});
 let closed=false,last=Date.now(),second=Math.floor(Date.now()/1000),frames=0;
 const queue=[];
 const notify=data=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(data));};
 const close=()=>{if(closed)return;closed=true;clearInterval(pacer);clearInterval(watchdog);client.close();upstream.close();};
 const pacer=setInterval(()=>{if(queue.length&&upstream.readyState===WebSocket.OPEN)upstream.send(queue.shift());},32);
 const watchdog=setInterval(()=>{if(Date.now()-last>120000||Date.now()-claim.iat*1000>60000)close();},1000);
 upstream.on("open",()=>notify({type:"connected",transport:"prisma-stream"}));
 upstream.on("message",message=>{try{
  const e=JSON.parse(message.toString());
  if(["connected","processing","transcript","speech_start","error"].includes(e.type)){
   notify({type:e.type,text:typeof e.text==="string"?e.text.slice(0,6000):undefined,
    message:typeof e.message==="string"?e.message.slice(0,300):undefined,
    detected_language_code:e.detected_language_code});
  }
 }catch{notify({type:"error",message:"Invalid provider response"});}});
 upstream.on("error",()=>{notify({type:"error",message:"Prisma connection failed"});close();});
 upstream.on("close",close);
 client.on("message",(data,binary)=>{
  if(!binary||data.length!==1024){notify({type:"error",message:"Expected 1024-byte PCM16LE frames"});close();return;}
  const now=Math.floor(Date.now()/1000);if(now!==second){second=now;frames=0;}
  if(++frames>50||queue.length>90){notify({type:"error",message:"Audio rate limit exceeded"});close();return;}
  last=Date.now();queue.push(Buffer.from(data));
 });
 client.on("close",close);client.on("error",close);
});
httpServer.listen(PORT,"0.0.0.0",()=>console.log("Smriti Gnani gateway ready"));
