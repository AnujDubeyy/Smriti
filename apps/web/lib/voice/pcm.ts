/** Convert browser Float32 audio into 16 kHz PCM16LE 512-sample frames for Prisma v3. */
export class PcmFrameEncoder{
 private next=0;
 private pending=new Uint8Array(1024);
 private count=0;
 constructor(private readonly sampleRate:number){if(sampleRate<16000||sampleRate>192000)throw new Error("Unsupported microphone rate");}
 write(samples:Float32Array,send:(frame:Uint8Array)=>void){
  const increment=this.sampleRate/16000;
  while(this.next<samples.length){
   const i=Math.min(samples.length-1,Math.floor(this.next));
   const value=Math.max(-1,Math.min(1,samples[i]));
   const pcm=value<0?Math.round(value*32768):Math.round(value*32767);
   this.pending[this.count++]=pcm&255;
   this.pending[this.count++]=(pcm>>8)&255;
   if(this.count===1024){send(this.pending);this.pending=new Uint8Array(1024);this.count=0;}
   this.next+=increment;
  }
  this.next-=samples.length;
 }
 reset(){this.next=0;this.count=0;this.pending.fill(0);}
}
