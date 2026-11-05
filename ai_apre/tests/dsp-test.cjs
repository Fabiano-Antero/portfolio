/* Reproducible numerical tests: node tests/dsp-test.cjs. No dependencies or hardware. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../audio-processors.js'),'utf8');
const report={version:12,tests:[]};
function setup(sr){const C={};const scope={sampleRate:sr,currentTime:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage(){}};}},registerProcessor:(n,c)=>C[n]=c};vm.createContext(scope);vm.runInContext(source,scope);return {C,scope};}
function parameters(P,overrides={}){return Object.fromEntries(P.parameterDescriptors.map(d=>[d.name,new Float32Array([overrides[d.name]??d.defaultValue])]))}
for(const sr of [44100,48000,96000]){
 const {C,scope}=setup(sr),FX=C['cyber-voice-v2'];
 for(const mix of [.35,.65,1]){
  const fx=new FX(),p=parameters(FX,{mix,pitch:0});const x=new Float32Array(128),y=new Float32Array(128);
  for(let n=0;n<500;n++){fx.process([[x]],[[y]],p);}
  let nonzero=0,tail=0;const positions=[];
  for(let b=0;b<100;b++){
   x.fill(0);if(b===0)x[31]=.5;
   fx.process([[x]],[[y]],p);
   for(let i=0;i<128;i++){assert.ok(Number.isFinite(y[i]));if(Math.abs(y[i])>1e-8){nonzero++;positions.push(b*128+i);}if(b*128+i>31)tail=Math.max(tail,Math.abs(y[i]));}
  }
  assert.equal(nonzero,1);assert.equal(positions[0],31);assert.equal(tail,0);
  report.tests.push({name:'zero-pitch-effect-has-one-impulse-no-delayed-copy',sampleRate:sr,mix,nonzero,tail});
 }
 // Exact bypass after coefficient settling.
 const fx=new FX(),p=parameters(FX,{enabled:0});const x=new Float32Array(128),y=new Float32Array(128);let maxError=0;
 for(let b=0;b<600;b++){for(let i=0;i<128;i++)x[i]=.2*Math.sin(2*Math.PI*180*(b*128+i)/sr);fx.process([[x]],[[y]],p);if(b>500)for(let i=0;i<128;i++)maxError=Math.max(maxError,Math.abs(x[i]-y[i]));}
 assert.equal(maxError,0);report.tests.push({name:'effect-bypass-exact',sampleRate:sr,maxError});
 // Gate default does not chop quiet words: exact 8ms-delayed pass.
 const G=C['pause-gate-v2'],g=new G(),gp=parameters(G),N=Math.ceil(sr*1.2/128)*128,d=Math.round(sr*.008);
 const input=new Float32Array(N),output=new Float32Array(N);
 for(let i=0;i<N;i++)input[i]=(i<sr*.5?.15:.00003)*Math.sin(2*Math.PI*170*i/sr);
 for(let i=0;i<N;i+=128)g.process([[input.subarray(i,i+128)]],[[output.subarray(i,i+128)]],gp);
 let gateError=0;for(let i=d;i<N;i++)gateError=Math.max(gateError,Math.abs(input[i-d]-output[i]));
 assert.ok(gateError<1e-8);report.tests.push({name:'continuous-gate-does-not-cut-low-level-speech',sampleRate:sr,gateError});
 // Aggressive parameter changes remain finite; limiter never exceeds -1 dBFS.
 const stress=new FX(),sp=parameters(FX),L=C['sample-peak-limiter-v2'],limiter=new L(),z=new Float32Array(128);let peak=0;
 for(let b=0;b<2000;b++){
  if(b%100===0){sp.pitch[0]=[-7,0,7][Math.floor(b/100)%3];sp.enabled[0]=b%400===0?0:1;sp.mix[0]=b%200===0?1:.4;}
  for(let i=0;i<128;i++)x[i]=3*Math.sin(2*Math.PI*210*(b*128+i)/sr);
  stress.process([[x]],[[y]],sp);limiter.process([[y]],[[z]],{});
  for(const v of z){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
 }
 assert.ok(peak<=10**(-1/20)+1e-6);report.tests.push({name:'changes-finite-limiter-safe-sample-ceiling',sampleRate:sr,peak});
}
report.passed=report.tests.length;console.log(JSON.stringify(report,null,2));
