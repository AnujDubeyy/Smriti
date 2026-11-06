class SmritiPcmFrameProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.samples = new Int16Array(512);
    this.offset = 0;
    this.ratio = 16000 / sampleRate;
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input) {
      for (let i = 0; i < input.length; i += 1) {
        this.phase += this.ratio;
        while (this.phase >= 1) {
          const value = Math.max(-1, Math.min(1, input[i]));
          this.samples[this.offset++] = value < 0 ? value * 32768 : value * 32767;
          this.phase -= 1;
          if (this.offset === 512) {
            const frame = this.samples.buffer;
            this.port.postMessage(frame, [frame]);
            this.samples = new Int16Array(512);
            this.offset = 0;
          }
        }
      }
    }
    for (const output of outputs) for (const channel of output) channel.fill(0);
    return true;
  }
}

registerProcessor('smriti-pcm-frame-processor', SmritiPcmFrameProcessor);
