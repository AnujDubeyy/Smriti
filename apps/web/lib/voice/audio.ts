export const MAX_AUDIO_BYTES=960044;
export function inspectWav(bytes:Uint8Array){
 if(bytes.length<44||bytes.length>MAX_AUDIO_BYTES)throw new Error('audio_size');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const str=(p:number,n:number)=>String.fromCharCode(...bytes.slice(p,p+n));
 if(str(0,4)!=='RIFF'||str(8,4)!=='WAVE'||d.getUint32(4,true)+8!==bytes.length)throw new Error('invalid_audio');
 let rate=0,align=0,found=false,size=0;
 for(let p=12;p+8<=bytes.length;){const n=d.getUint32(p+4,true);if(p+8+n>bytes.length)throw new Error('invalid_audio');
 if(str(p,4)==='fmt '){if(n<16||d.getUint16(p+8,true)!==1||d.getUint16(p+10,true)!==1||d.getUint16(p+22,true)!==16)throw new Error('audio_format');rate=d.getUint32(p+12,true);align=d.getUint16(p+20,true);if(rate!==16000||align!==2||d.getUint32(p+16,true)!==32000)throw new Error('audio_format');found=true;}
 if(str(p,4)==='data')size+=n;p+=8+n+(n%2);}
 const durationMs=size/32000*1000;if(!found||!size||size%align||durationMs<100||durationMs>30000)throw new Error('audio_duration');return{durationMs,rate};
}
export function encodeWav(samples:Float32Array,sampleRate:number){
 if(sampleRate<16000||sampleRate>192000||samples.length>sampleRate*30)throw new Error('audio_duration');
 const length=Math.floor(samples.length*16000/sampleRate);const b=new Uint8Array(44+length*2);const d=new DataView(b.buffer);const text=(p:number,s:string)=>{for(let i=0;i<s.length;i++)b[p+i]=s.charCodeAt(i);};
 text(0,'RIFF');d.setUint32(4,b.length-8,true);text(8,'WAVE');text(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,16000,true);d.setUint32(28,32000,true);d.setUint16(32,2,true);d.setUint16(34,16,true);text(36,'data');d.setUint32(40,length*2,true);
 for(let i=0;i<length;i++){const a=Math.floor(i*sampleRate/16000),z=Math.min(samples.length,Math.floor((i+1)*sampleRate/16000));let sum=0;for(let j=a;j<z;j++)sum+=samples[j];const v=Math.max(-1,Math.min(1,sum/Math.max(1,z-a)));d.setInt16(44+i*2,v<0?v*32768:v*32767,true);}return b;
}
