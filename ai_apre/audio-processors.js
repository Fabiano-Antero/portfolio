'use strict';
// Processamento mono na thread de áudio: não depende da animação ou de timers da página.
class PauseGate extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [
    {name:'threshold',defaultValue:-60,minValue:-80,maxValue:-25,automationRate:'k-rate'},
    {name:'enabled',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'attenuation',defaultValue:12,minValue:3,maxValue:24,automationRate:'k-rate'},
    {name:'holdMs',defaultValue:500,minValue:150,maxValue:1200,automationRate:'k-rate'},
    {name:'releaseMs',defaultValue:450,minValue:150,maxValue:1000,automationRate:'k-rate'}
  ]; }
  constructor() {
    super();
    // Fixed look-ahead in bypass and enabled modes avoids a timing jump on toggles.
    this.delay=new Float32Array(Math.max(1,Math.round(sampleRate*.008)));
    this.cursor=0;this.envelope=0;this.gain=1;this.open=true;this.hold=0;
    this.frames=0;this.energy=0;this.peak=0;
    this.attack=Math.exp(-1/(sampleRate*.003));
  }
  process(inputs,outputs,p) {
    const input=inputs[0]?.[0], output=outputs[0]?.[0]; if(!output)return true;
    let energy=0,peak=0;
    for(let i=0;i<output.length;i++) {
      const x=input&&Number.isFinite(input[i])?input[i]:0;
      energy+=x*x;peak=Math.max(peak,Math.abs(x));
    }
    const mean=energy/output.length;
    const c=Math.exp(-output.length/(sampleRate*(mean > this.envelope ? .002 : .070)));
    this.envelope=mean+(this.envelope-mean)*c;
    const db=10*Math.log10(Math.max(this.envelope,1e-12));
    const enabled=p.enabled[0]>=.5, threshold=p.threshold[0];
    const holdSamples=Math.round(sampleRate*p.holdMs[0]/1000);
    if(!enabled||db>=threshold){this.open=true;this.hold=holdSamples;}
    else if(this.open){
      if(db>=threshold-6)this.hold=holdSamples;
      else this.hold=Math.max(0,this.hold-output.length);
      if(!this.hold)this.open=false;
    }
    // No hard gate: even far below threshold the attenuation is bounded.
    // With the default enabled=0 the input passes unchanged (apart from 8 ms).
    const reduction=enabled&&!this.open?Math.min(p.attenuation[0],Math.max(0,threshold-db)*.55):0;
    const target=Math.pow(10,-reduction/20);
    const release=Math.exp(-1/(sampleRate*p.releaseMs[0]/1000));
    const smoothing=target>this.gain?this.attack:release;
    for(let i=0;i<output.length;i++) {
      const x=input&&Number.isFinite(input[i])?input[i]:0;
      const delayed=this.delay[this.cursor];this.delay[this.cursor]=x;
      this.cursor=(this.cursor+1)%this.delay.length;
      this.gain=target+(this.gain-target)*smoothing;
      output[i]=delayed*this.gain;
    }
    this.energy+=energy;this.peak=Math.max(this.peak,peak);this.frames+=output.length;
    if(this.frames>=sampleRate*.05){
      this.port.postMessage({kind:'meter',time:currentTime,
        db:10*Math.log10(Math.max(this.energy/this.frames,1e-12)),peak:this.peak,
        open:this.open,gain:this.gain,reduction:20*Math.log10(Math.max(this.gain,1e-12))});
      this.frames=0;this.energy=0;this.peak=0;
    }
    return true;
  }
}
// Limitador de pico de amostra com antecipação de 6 ms e recuperação de 100 ms.
// Uma fila monotônica mantém o maior pico da janela sem varrer todo o buffer.
// Não é medidor true-peak e não corrige distorção já presente no microfone.
class SamplePeakLimiter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.lookahead = Math.max(1,Math.round(sampleRate*0.006));
    this.buffer = new Float32Array(this.lookahead+1);
    this.queueValues = new Float32Array(this.lookahead+3);
    this.queueIndices = new Float64Array(this.lookahead+3);
    this.head = 0; this.tail = 0; this.count = 0;
    this.index = 0; this.cursor = 0; this.gain = 1;
    this.release = Math.exp(-1/(sampleRate*0.100));
    this.ceiling = Math.pow(10,-1/20);
    this.frames=0; this.minGain=1;
  }
  process(inputs,outputs) {
    const input=inputs[0]?.[0], output=outputs[0]?.[0];
    if (!output) return true;
    const length=this.queueValues.length;
    for (let i=0; i<output.length; i++) {
      const x=input && Number.isFinite(input[i]) ? input[i] : 0;
      const magnitude=Math.abs(x);
      // Remover amostras que já saíram da janela de antecipação.
      while(this.count && this.queueIndices[this.head]<this.index-this.lookahead) {
        this.head=(this.head+1)%length; this.count--;
      }
      while(this.count) {
        const last=(this.tail-1+length)%length;
        if(this.queueValues[last]>magnitude) break;
        this.tail=last; this.count--;
      }
      this.queueValues[this.tail]=magnitude;
      this.queueIndices[this.tail]=this.index;
      this.tail=(this.tail+1)%length; this.count++;
      this.buffer[this.cursor]=x;
      const delayed=this.buffer[(this.cursor+1)%this.buffer.length];
      this.cursor=(this.cursor+1)%this.buffer.length;
      const windowPeak=this.queueValues[this.head];
      const target=windowPeak>this.ceiling ? this.ceiling/windowPeak : 1;
      this.gain=target<this.gain ? target : target+(this.gain-target)*this.release;
      // Salvaguarda numérica: o limitador controla o ganho antes desta contenção.
      output[i]=Math.max(-this.ceiling,Math.min(this.ceiling,delayed*this.gain));
      this.minGain=Math.min(this.minGain,this.gain);
      this.index++; this.frames++;
    }
    if(this.frames>=sampleRate*0.1) {
      this.port.postMessage({kind:'limiter',reduction:20*Math.log10(Math.max(this.minGain,1e-8))});
      this.frames=0; this.minGain=1;
    }
    return true;
  }
}

// v12: one processed voice, not a persistent dry + delayed-voice mixture.
// At pitch=0 the effect is sample-local: no chorus, delay tap or reverb.
// Optional pitch transposition still uses two complementary granular read heads,
// exclusively on the processed stream; it may add coloration and 4–28 ms delay.
class CyberVoice extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [
    {name:'enabled',defaultValue:1,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'mix',defaultValue:.35,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'pitch',defaultValue:0,minValue:-7,maxValue:7,automationRate:'k-rate'},
    {name:'robot',defaultValue:.24,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'carrier',defaultValue:72,minValue:20,maxValue:160,automationRate:'k-rate'}
  ]; }
  constructor() {
    super();
    const length=2**Math.ceil(Math.log2(sampleRate*.12));
    this.buffer=new Float32Array(length);this.mask=length-1;this.cursor=0;
    this.phase=.25;this.ringPhase=0;
    this.window=sampleRate*.024;this.baseDelay=sampleRate*.004;
    this.amount=0;this.ratio=1;this.depth=0;this.carrier=72;this.shiftBlend=0;
    this.smooth=1-Math.exp(-1/(sampleRate*.012));
  }
  read(delay) {
    const position=this.cursor-delay,index=Math.floor(position),f=position-index;
    return this.buffer[index & this.mask]*(1-f)+this.buffer[(index+1)&this.mask]*f;
  }
  process(inputs,outputs,p) {
    const input=inputs[0]?.[0],output=outputs[0]?.[0];if(!output)return true;
    const amount=p.enabled[0]>=.5?p.mix[0]:0;
    const shifting=amount>0&&Math.abs(p.pitch[0])>.01;
    const targetRatio=shifting?Math.pow(2,p.pitch[0]/12):1;
    const tau=2*Math.PI;
    for(let i=0;i<output.length;i++) {
      const x=input&&Number.isFinite(input[i])?input[i]:0;
      this.buffer[this.cursor]=x;
      this.amount+=(amount-this.amount)*this.smooth;
      this.depth+=(p.robot[0]*amount-this.depth)*this.smooth;
      this.carrier+=(p.carrier[0]-this.carrier)*this.smooth;
      this.ratio+=(targetRatio-this.ratio)*this.smooth;
      this.shiftBlend+=((shifting?1:0)-this.shiftBlend)*this.smooth;
      if(this.shiftBlend<1e-6&&!shifting)this.shiftBlend=0;
      if(this.shiftBlend>1-1e-6&&shifting)this.shiftBlend=1;
      this.ringPhase=(this.ringPhase+this.carrier/sampleRate)%1;
      let voice=x;
      if(this.shiftBlend>0) {
        this.phase+=(1-this.ratio)/this.window;this.phase-=Math.floor(this.phase);
        const a=this.phase,b=(a+.5)%1,w=.5-.5*Math.cos(tau*a);
        const shifted=this.read(this.baseDelay+a*this.window)*w+
          this.read(this.baseDelay+b*this.window)*(1-w);
        // Brief crossfade only when entering/leaving pitch shift, not an FX mix.
        voice=this.shiftBlend===1?shifted:x+(shifted-x)*this.shiftBlend;
      }
      // Intensity adjusts modulation depth on this one stream.
      const d=this.depth,carrier=(1-d)+d*Math.sin(tau*this.ringPhase);
      const compensation=Math.min(1.4,1/Math.sqrt((1-d)**2+d*d*.5));
      const y=voice*carrier*compensation;
      output[i]=Number.isFinite(y)?y:0;
      if(amount===0&&this.amount<1e-6&&this.shiftBlend===0){
        this.amount=0;this.depth=0;output[i]=x;
      }
      this.cursor=(this.cursor+1)&this.mask;
    }
    return true;
  }
}
registerProcessor('cyber-voice-v2',CyberVoice);
registerProcessor('pause-gate-v2',PauseGate);
registerProcessor('sample-peak-limiter-v2',SamplePeakLimiter);
