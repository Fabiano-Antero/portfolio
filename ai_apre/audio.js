'use strict';
const $ = (id) => document.getElementById(id);
const canvas=$('wave'), painter=canvas.getContext('2d');
const AudioContextClass=window.AudioContext||window.webkitAudioContext;
const supported=!!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && AudioContextClass && window.AudioWorkletNode && painter);
let session=null, frameId=0, width=0, height=0, lastLevelUpdate=0;
let comparingOriginal=false;
const VOICE_PROFILES={
  assistant:{name:'Assistente IA',tag:'ASSISTENTE // 01',badge:'ASSISTENTE',pitch:0,mix:35,robot:.24,carrier:72,description:'Textura eletrônica leve, sem duplicação e sem transposição por padrão. Uma única voz processada.'},
  android:{name:'Androide',tag:'ANDROIDE // 02',badge:'ANDROIDE',pitch:0,mix:65,robot:.50,carrier:48,description:'Modulação metálica mais presente, sem chorus nem camada de voz atrasada. Tom original por padrão.'},
  robot:{name:'Robô digital',tag:'ROBÔ DIGITAL // 03',badge:'ROBÔ',pitch:0,mix:85,robot:.90,carrier:86,description:'Modulação em anel forte, sem eco acrescentado pelo efeito. Reduza a intensidade para preservar a clareza.'}
};
// Stored only in this browser/origin. No microphone is opened on page load.
const MONITOR_KEY='voz.monitor.preference.v12', VOLUME_KEY='voz.monitor.volume.v12';
let monitorWanted=false;
try {
  monitorWanted=localStorage.getItem(MONITOR_KEY)==='on';
  const saved=localStorage.getItem(VOLUME_KEY);
  if(saved!==null&&Number.isFinite(Number(saved)))$('volume').value=String(Math.max(0,Math.min(1,Number(saved))));
} catch { /* Storage can be blocked; in-page persistence still works. */ }
$('monitor').checked=monitorWanted;
function chooseMonitor(value) {
  monitorWanted=!!value;
  try{localStorage.setItem(MONITOR_KEY,monitorWanted?'on':'off');}catch{}
  updateMonitor();
}
function monitorState() {
  if(!monitorWanted)return {audible:false,label:'Retorno desligado',reason:'off'};
  if(!session||session.phase!=='live')return {audible:false,label:'Retorno ligado · sem captura',reason:'no-capture'};
  if(session.calibration)return {audible:false,label:'Retorno ligado · calibrando',reason:'calibration'};
  if(session.context.state!=='running')return {audible:false,label:'Retorno ligado · áudio suspenso',reason:'suspended'};
  if(session.stream?.getAudioTracks()[0]?.muted)return {audible:false,label:'Retorno ligado · sem sinal',reason:'muted-input'};
  if(!AudioOutput.canMonitor(session))return {audible:false,label:'Retorno ligado · saída em espera',reason:'output-wait'};
  return {audible:true,label:'Retorno ligado',reason:'playing'};
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const dbToGain=(db)=>Math.pow(10,db/20);
const percentile=(values,fraction)=>{const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.floor((sorted.length-1)*fraction)];};
const signed=(value)=>`${value>=0?'+':'−'}${Math.abs(value)}`;
function setStatus(message,kind='idle') {
  $('statusText').textContent=message; $('status').dataset.kind=kind;
  document.body.classList.toggle('is-live',kind==='live');
  $('idlePrompt').hidden=kind==='live';
  $('idlePrompt').textContent=kind==='error'?'VERIFIQUE O ACESSO AO MICROFONE':'AGUARDANDO SUA VOZ';
}
function syncRangeFills(){
  for(const range of document.querySelectorAll('input[type="range"]')){
    const min=Number(range.min), max=Number(range.max);
    range.style.setProperty('--fill',`${(Number(range.value)-min)/(max-min)*100}%`);
  }
}
function feedback(id,message,kind='info') { $(id).textContent=message; $(id).dataset.kind=kind; }
function setControls(phase) {
  if(session) session.phase=phase;
  const busy=phase==='starting', active=phase==='live', calibrating=!!session?.calibration;
  const paused=active && session.context.state!=='running';
  $('captureToggle').disabled=!supported;
  $('captureToggle').textContent=busy?'Cancelar ativação':active?'Encerrar captura':'Ativar microfone';
  $('captureToggle').setAttribute('aria-pressed',String(active));
  $('captureToggle').dataset.phase=phase;
  $('device').disabled=busy||active;
  for(const id of ['nativeNoise','nativeEcho','speechMode']) $(id).disabled=busy||calibrating||!!session?.applyingNative;
  for(const id of ['calibrateNoise','calibrateVoice']) $(id).disabled=!active||calibrating||paused;
  for(const id of ['voiceGain','threshold','gateEnabled','tone','gateAttenuation','gateHold','gateRelease']) $(id).disabled=calibrating;
  for(const id of ['threshold','gateAttenuation','gateHold','gateRelease'])$(id).disabled=calibrating||!$('gateEnabled').checked;
  $('monitor').disabled=false;
  $('volume').disabled=false;
  updateVoiceEffect();AudioOutput.syncControls(session);
}
function setParam(param,value,context,timeConstant=0.015) {
  // Evita acumular automações durante o arraste de sliders.
  const now=context.currentTime;
  if(param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
  else { const current=param.value; param.cancelScheduledValues(now); param.setValueAtTime(current,now); }
  param.setTargetAtTime(value,now,timeConstant);
}
function updateMonitor() {
  const output=monitorState();
  $('monitor').checked=monitorWanted;
  $('monitor').disabled=false;$('volume').disabled=false;
  $('returnState').textContent=output.label;
  $('monitorToggle').setAttribute('aria-pressed',String(monitorWanted));
  $('monitorToggle').setAttribute('aria-label',monitorWanted?'Desligar retorno':'Ligar retorno');
  $('monitorToggle').dataset.audible=String(output.audible);
  $('returnDetail').textContent=monitorWanted&&!output.audible?'Preferência mantida':'Use fones e volume baixo';
  $('volumeValue').textContent=`${Math.round(Number($('volume').value)*100)}%`;
  document.body.classList.toggle('monitor-on',monitorWanted);syncRangeFills();
  // Inaudible while unavailable, but never overwrite the user's preference.
  if(session?.monitorGain&&session.context.state!=='closed')
    setParam(session.monitorGain.gain,output.audible?Number($('volume').value):0,session.context,.025);
  $('listenVoice').textContent=monitorWanted?'Desligar retorno':'Ligar retorno';
  $('listenVoice').setAttribute('aria-pressed',String(monitorWanted));
  updateVoiceEffect();
}

function updateVoiceEffect() {
  const profile=VOICE_PROFILES[$('voicePreset').value]||VOICE_PROFILES.assistant;
  const enabled=$('effectEnabled').checked;
  const active=session?.phase==='live';
  const paused=!!active && session.context.state!=='running';
  const calibrating=!!session?.calibration;
  const mix=Number($('effectMix').value),pitch=Number($('voicePitch').value);
  const applied=enabled&&!comparingOriginal&&mix>0;
  $('effectMixValue').textContent=`${mix}%`;
  $('voicePitchValue').textContent=pitch===0?'Original':`${signed(pitch).replace('.',',')} semitons`;
  $('presetTag').textContent=profile.tag;$('presetDescription').textContent=profile.description;
  $('effectEnabled').disabled=calibrating;
  for(const id of ['voicePreset','effectMix','voicePitch'])$(id).disabled=calibrating||!enabled;
  $('compareVoice').disabled=!active||calibrating||!enabled||paused;
  $('compareVoice').textContent=comparingOriginal?'Voltar ao efeito':'Comparar original';
  $('compareVoice').setAttribute('aria-pressed',String(comparingOriginal));
  $('listenVoice').disabled=false;
  $('voiceBadge').textContent=applied?`FX / ${profile.badge}`:'FX / ORIGINAL';
  $('voiceBadge').dataset.bypass=String(!applied);
  const listening=monitorState().audible;
  const description=applied?`${profile.name} · ${mix}%`:'Voz original · efeito ignorado';
  $('voiceStatus').textContent=`${description}${!active?' · preparado':''} · ${listening?'retorno ligado':monitorWanted?'retorno ligado · em espera':'retorno desligado'}`;
  syncRangeFills();
  if(!session?.voiceFx)return;
  const now=session.context.currentTime,params=session.voiceFx.parameters;
  // A suavização acontece na thread de áudio, inclusive durante comparações A/B.
  const values={enabled:enabled&&!comparingOriginal?1:0,mix:mix/100,pitch,robot:profile.robot,carrier:profile.carrier};
  for(const [name,value] of Object.entries(values))params.get(name).setValueAtTime(value,now);
}
function selectVoiceProfile() {
  const profile=VOICE_PROFILES[$('voicePreset').value]||VOICE_PROFILES.assistant;
  $('effectMix').value=String(profile.mix);$('voicePitch').value=String(profile.pitch);
  comparingOriginal=false;updateVoiceEffect();
}

function updateProcessing() {
  const gainDb=Number($('voiceGain').value), threshold=Number($('threshold').value);
  $('voiceGainValue').textContent=`${signed(gainDb)} dB · ${dbToGain(gainDb).toFixed(1).replace('.',',')}×`;
  $('thresholdValue').textContent=`${signed(threshold)} dBFS`;
  $('threshold').disabled=!!session?.calibration||!$('gateEnabled').checked;
  $('gateAttenuationValue').textContent=`${$('gateAttenuation').value} dB`;
  $('gateHoldValue').textContent=`${$('gateHold').value} ms`;
  $('gateReleaseValue').textContent=`${$('gateRelease').value} ms`;
  for(const id of ['gateAttenuation','gateHold','gateRelease']) $(id).disabled=!!session?.calibration||!$('gateEnabled').checked;
  syncRangeFills();
  if(!session?.voiceGain) return;
  const item=session, context=item.context;
  setParam(item.voiceGain.gain,dbToGain(gainDb),context);
  item.gate.parameters.get('threshold').setValueAtTime(threshold,context.currentTime);
  item.gate.parameters.get('enabled').setValueAtTime($('gateEnabled').checked?1:0,context.currentTime);
  for(const [parameter,id] of [['attenuation','gateAttenuation'],['holdMs','gateHold'],['releaseMs','gateRelease']]) item.gate.parameters.get(parameter).setValueAtTime(Number($(id).value),context.currentTime);
  const profiles={natural:[75,12000],balanced:[100,8500],strong:[130,6500]};
  const [low,high]=profiles[$('tone').value]||profiles.balanced;
  setParam(item.highpass.frequency,low,context);
  setParam(item.lowpass.frequency,Math.min(high,context.sampleRate*0.45),context);
}
async function listDevices() {
  if(!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices=await navigator.mediaDevices.enumerateDevices();
    const previous=$('device').value;
    const options=[new Option('Microfone padrão do sistema','')];
    let number=0;
    for(const device of devices.filter(d=>d.kind==='audioinput')) {
      if(device.deviceId) options.push(new Option(device.label||`Microfone ${++number}`,device.deviceId));
    }
    $('device').replaceChildren(...options);
    if(options.some(option=>option.value===previous)) $('device').value=previous;
  } catch(error) { console.warn('Não foi possível listar os microfones:',error.name); }
}
function dispose(item) {
  if(!item) return;
  AudioOutput.detach(item);
  if(item.monitorGain&&item.context?.state!=='closed'){
    item.monitorGain.gain.cancelScheduledValues(item.context.currentTime);
    item.monitorGain.gain.setValueAtTime(0,item.context.currentTime);
  }
  item.calibration=null;
  item.releaseCapture?.();item.releaseCapture=null;
  item.stream?.getTracks().forEach(track=>track.stop());
  for(const node of item.nodes||[]) {
    if(node.port) { node.port.onmessage=null; node.port.close(); }
    try { node.disconnect(); } catch { /* Já desconectado. */ }
  }
  if(item.context && item.context.state!=='closed') void item.context.close().catch(()=>{});
}
function stop(message='Microfone desligado',kind='idle') {
  const previous=session; session=null; comparingOriginal=false;
  cancelAnimationFrame(frameId); frameId=0;
  dispose(previous);
  $('resume').hidden=true;
  $('calibration').hidden=true; $('signalWarning').hidden=true;
  for(const prefix of ['input','level']) { $(prefix+'Value').textContent='— dBFS'; $(prefix+'Meter').value=-80; }
  $('sessionTime').textContent='00:00';$('sampleRate').innerHTML='— <small>kHz</small>';
  $('gateState').textContent='Filtro de pausas aguardando captura';
  $('peakState').textContent='Compressor de dinâmica + limitador de picos digitais ativos durante a captura.';
  updateMonitor(); setControls('idle'); setStatus(message,kind); draw();
}
function errorMessage(error) {
  const messages={
    CaptureInUse:'Outra aba desta versão já está capturando. Encerre nela antes de ativar aqui para evitar dois retornos.',
    NotAllowedError:'Acesso negado. Autorize o microfone no navegador e no sistema.',
    NotFoundError:'Nenhum microfone encontrado. Conecte um dispositivo e tente novamente.',
    NotReadableError:'Microfone indisponível. Verifique o dispositivo e outros aplicativos.',
    OverconstrainedError:'A entrada selecionada não está disponível. Escolha o microfone padrão.',
    SecurityError:'Abra a página em HTTPS ou localhost para permitir a captura.',
    AbortError:'A captura foi interrompida. Tente novamente.',
    WorkletUnavailable:'Processamento de áudio indisponível. Use um navegador atualizado em HTTPS ou localhost.',
    WorkletLoadError:'Não foi possível carregar o tratamento de áudio. Abra pelo servidor local; não use a prévia de arquivos.'
  };
  return messages[error?.name]||'Não foi possível iniciar. Verifique as permissões, abra por localhost e tente novamente.';
}
function beginCalibration(kind) {
  const item=session;
  if(!item?.gate || item.calibration || item.context.state!=='running') return;
  // Temporarily suspend monitoring during measurement without changing intent.
  const duration=kind==='noise'?3:4;
  item.calibration={kind,start:item.context.currentTime,duration,values:[]};
  updateMonitor();
  $('calibrationTitle').textContent=kind==='noise'?'Fique em silêncio por 3 segundos.':'Fale normalmente por 4 segundos.';
  $('calibrationText').textContent=kind==='noise'?'Mantenha a distância habitual e deixe apenas o som do ambiente. Não toque no microfone.':'Diga uma frase completa na distância em que você usará o microfone. Não grite. O ajuste será aplicado ao terminar.';
  $('calibrationProgress').value=0; $('calibration').hidden=false;
  setControls('live');
}
function cancelCalibration(message='Calibração cancelada. Os ajustes anteriores foram mantidos.') {
  const item=session;
  if(!item?.calibration) return;
  const kind=item.calibration.kind; item.calibration=null;
  $('calibration').hidden=true;
  feedback(kind==='noise'?'noiseResult':'voiceResult',message,'warn');
  setControls(item.phase||'live'); updateMonitor();
}
function finishCalibration(item) {
  if(session!==item || !item.calibration) return;
  const calibration=item.calibration;
  item.calibration=null; $('calibration').hidden=true;
  const id=calibration.kind==='noise'?'noiseResult':'voiceResult';
  if(calibration.values.length<8) {
    feedback(id,'Não houve amostras suficientes. Mantenha a captura ativa e tente novamente.','warn');
  } else if(calibration.kind==='noise') {
    const noise=percentile(calibration.values,0.85);
    const threshold=clamp(Math.round(noise+3),-75,-45);
    $('threshold').value=String(threshold); // Measuring the room never enables attenuation implicitly.
    item.noiseFloor=noise;
    feedback(id,`Ruído estimado: ${noise.toFixed(0)} dBFS. Referência: ${threshold} dBFS. Atenuação extra ${$('gateEnabled').checked?'ativada':'desativada'}.${noise>-35?' Ambiente ruidoso: aproxime o microfone e reduza as fontes de ruído.':''}`,noise>-35?'warn':'info');
  } else {
    const threshold=Number($('threshold').value);
    const voiced=calibration.values.filter(db=>db>Math.max(-90,(item.noiseFloor??-90)+3));
    if(voiced.length<8) {
      feedback(id,'Voz insuficiente acima do limite. Aproxime o microfone ou diminua o corte e repita.','warn');
    } else {
      const quiet=percentile(voiced,.20);
      if(quiet-10<Number($('threshold').value)) $('threshold').value=String(clamp(Math.floor(quiet-10),-80,-25));
      const speech=percentile(voiced,0.75);
      const suggested=-22-speech;
      const gain=clamp(Math.round(suggested),0,30);
      $('voiceGain').value=String(gain);
      feedback(id,`Ganho ajustado para ${signed(gain)} dB.${suggested>30?' A entrada continua fraca: confira o microfone e o nível de entrada no sistema.':' Ligue o retorno com fones e refine o volume, se necessário.'}`,suggested>30?'warn':'info');
    }
  }
  updateProcessing(); setControls('live'); updateMonitor();
}
function receiveMeter(item,data) {
  if(session!==item) return;
  item.lastMeter=data;
  const gateEnabled=$('gateEnabled').checked;
  $('gateState').textContent=!gateEnabled?'Fala contínua · sem corte por nível':data.open?'Voz preservada · atenuação em espera':`Atenuação suave: ${Math.abs(data.reduction||0).toFixed(1)} dB · sem silenciar totalmente`;
  const calibration=item.calibration;
  if(!calibration) return;
  const elapsed=data.time-calibration.start;
  if(elapsed<0) return;
  $('calibrationProgress').value=clamp(elapsed/calibration.duration,0,1);
  if(elapsed>=0.4 && elapsed<=calibration.duration && Number.isFinite(data.db)) calibration.values.push(data.db);
  if(elapsed>=calibration.duration) finishCalibration(item);
}
async function start() {
  if(session||!supported) return;
  const item={context:null,stream:null,nodes:[],phase:'starting',calibration:null,lastMeter:null,limiterReduction:0};
  session=item; comparingOriginal=false;
  feedback('noiseResult','Calibre novamente se mudou o microfone ou o ambiente.');
  feedback('voiceResult','Fale normalmente. O som será pausado só durante a medição; sua escolha de retorno será mantida.');
  setControls('starting'); setStatus('Autorize o acesso ao microfone');
  try {
    item.context=new AudioContextClass({latencyHint:'interactive'});
    const initialResume=item.context.resume(); initialResume.catch(()=>{});
    if(navigator.locks?.request){
      const acquired=await new Promise((resolve,reject)=>{
        navigator.locks.request('voz-exclusive-capture-v12',{ifAvailable:true},lock=>{
          if(!lock){resolve(false);return;}
          return new Promise(release=>{item.releaseCapture=release;resolve(true);});
        }).catch(reject);
      });
      if(session!==item){item.releaseCapture?.();return;}
      if(!acquired)throw Object.assign(new Error(),{name:'CaptureInUse'});
    }
    if(!item.context.audioWorklet) throw Object.assign(new Error(),{name:'WorkletUnavailable'});
    const selectedDevice=$('device').value;
    const stream=await navigator.mediaDevices.getUserMedia({video:false,audio:{
      ...(selectedDevice?{deviceId:{exact:selectedDevice}}:{}),channelCount:{ideal:1},
      noiseSuppression:$('nativeNoise').checked, echoCancellation:$('nativeEcho').checked, autoGainControl:false
    }});
    if(session!==item) { stream.getTracks().forEach(track=>track.stop()); return; }
    item.stream=stream;
    await initialResume;
    if(session!==item) return;
    const moduleURL=URL.createObjectURL(new Blob([$('audio-processors').textContent],{type:'application/javascript'}));
    try { await item.context.audioWorklet.addModule(moduleURL); }
    catch(error) { throw Object.assign(new Error('Falha ao carregar AudioWorklet',{cause:error}),{name:'WorkletLoadError'}); }
    finally { URL.revokeObjectURL(moduleURL); }
    if(session!==item) return;
    const context=item.context;item.startedAt=context.currentTime;
    $('sampleRate').innerHTML=`${(context.sampleRate/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} <small>kHz</small>`;
    const keep=(node)=>{item.nodes.push(node);return node;};
    item.source=keep(context.createMediaStreamSource(stream));
    item.rawAnalyser=keep(context.createAnalyser()); item.rawAnalyser.fftSize=2048;
    item.rawSamples=new Float32Array(item.rawAnalyser.fftSize);
    item.highpass=keep(context.createBiquadFilter()); item.highpass.type='highpass'; item.highpass.Q.value=-3.0103;
    item.lowpass=keep(context.createBiquadFilter()); item.lowpass.type='lowpass'; item.lowpass.Q.value=-3.0103;
    const workletOptions={numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:1,channelCountMode:'explicit'};
    item.gate=keep(new AudioWorkletNode(context,'pause-gate-v2',workletOptions));
    item.voiceGain=keep(context.createGain()); item.voiceGain.gain.value=dbToGain(Number($('voiceGain').value));
    item.speechAnalyser=keep(context.createAnalyser()); item.speechAnalyser.fftSize=1024;
    item.voiceFx=keep(new AudioWorkletNode(context,'cyber-voice-v2',workletOptions));
    item.compressor=keep(context.createDynamicsCompressor());
    item.compressor.threshold.value=-16; item.compressor.knee.value=12; item.compressor.ratio.value=3;
    item.compressor.attack.value=0.005; item.compressor.release.value=0.16;
    item.limiter=keep(new AudioWorkletNode(context,'sample-peak-limiter-v2',workletOptions));
    item.analyser=keep(context.createAnalyser()); item.analyser.fftSize=2048; item.analyser.smoothingTimeConstant=0.8;
    item.samples=new Float32Array(item.analyser.fftSize); item.frequencies=new Uint8Array(item.analyser.frequencyBinCount);
    item.monitorGain=keep(context.createGain()); item.monitorGain.gain.value=0;
    // O gate vem ANTES da amplificação: aumentar a voz não altera o limite calibrado.
    // O efeito fica ANTES do compressor/limitador; a visualização acompanha o som com efeito.
    // O desenho vem ANTES do volume de retorno: desligar os fones não para a linha.
    item.source.connect(item.rawAnalyser).connect(item.highpass).connect(item.lowpass)
      .connect(item.gate).connect(item.voiceGain).connect(item.speechAnalyser).connect(item.voiceFx).connect(item.compressor).connect(item.limiter)
      .connect(item.analyser).connect(item.monitorGain).connect(context.destination);
    updateProcessing();updateVoiceEffect();
    await AudioOutput.attach(item);
    if(session!==item)return;
    item.gate.port.onmessage=event=>receiveMeter(item,event.data);
    item.limiter.port.onmessage=event=>{if(session===item)item.limiterReduction=event.data.reduction;};
    for(const worklet of [item.gate,item.voiceFx,item.limiter]) worklet.addEventListener('processorerror',()=>{
      if(session===item) stop('O tratamento de áudio falhou. Encerrei a captura para não reproduzir áudio sem tratamento.','error');
    });
    const track=stream.getAudioTracks()[0];
    const settings=track.getSettings?.()||{};
    const state=value=>value===true?'ativo':value===false?'desligado':'não informado';
    $('nativeStatus').textContent=`Informado pelo navegador: redução de ruído ${state(settings.noiseSuppression)}; eco ${state(settings.echoCancellation)}; ganho automático ${state(settings.autoGainControl)}.`;
    const syncStatus=()=>{
      if(session!==item) return;
      const paused=context.state!=='running'; $('resume').hidden=!paused;
      if(paused||track.muted) {
        cancelCalibration('Calibração interrompida pelo navegador. Retome a captura e repita.');
      }
      setControls('live'); updateMonitor();
      if(paused) setStatus('Áudio pausado pelo navegador. Clique em Retomar áudio.');
      else if(track.muted) setStatus('Microfone temporariamente sem sinal');
      else setStatus('Capturando e tratando o áudio','live');
    };
    track.addEventListener('ended',()=>{if(session===item)stop('Microfone desconectado ou permissão encerrada.','error');});
    track.addEventListener('mute',syncStatus); track.addEventListener('unmute',syncStatus);
    context.addEventListener('statechange',syncStatus);
    updateProcessing(); setControls('live'); syncStatus(); updateMonitor();
    void listDevices(); animate();
  } catch(error) {
    if(session===item) stop(errorMessage(error),'error');
    else dispose(item);
  }
}
function resize() {
  const rect=canvas.getBoundingClientRect(); width=rect.width; height=rect.height;
  const scale=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(width*scale); canvas.height=Math.round(height*scale);
  painter.setTransform(scale,0,0,scale,0,0); draw();
}
function measure(samples) {
  let sum=0,peak=0;
  for(const value of samples) {sum+=value*value;peak=Math.max(peak,Math.abs(value));}
  return {db:10*Math.log10(Math.max(sum/samples.length,1e-12)),peak};
}
function showMeter(prefix,db) {
  $(prefix+'Value').textContent=db<-100?'−∞ dBFS':`${db.toFixed(0)} dBFS`;
  $(prefix+'Meter').value=clamp(db,-80,0);
}
function draw(timestamp=performance.now()) {
  if(!painter||!width)return;
  painter.clearRect(0,0,width,height);
  const middle=height/2, top=24, bottom=height-24;
  const active=!!(session?.analyser&&session.context.state==='running');
  painter.shadowBlur=0; painter.lineWidth=1;
  painter.strokeStyle='#48636f24'; painter.setLineDash([2,5]); painter.beginPath();
  for(let i=0;i<=12;i++) { const x=Math.round(width*i/12)+.5; painter.moveTo(x,top);painter.lineTo(x,bottom); }
  for(let i=0;i<5;i++) { const y=Math.round(top+(bottom-top)*i/4)+.5; painter.moveTo(0,y);painter.lineTo(width,y); }
  painter.stroke();painter.setLineDash([]);
  painter.strokeStyle='#4d6a7433'; painter.beginPath();
  painter.moveTo(0,middle+.5);painter.lineTo(width,middle+.5);painter.stroke();
  // Marcações técnicas decorativas. A curva abaixo usa apenas amostras reais.
  painter.fillStyle='#506b7455';
  for(let i=0;i<=48;i++){const x=width*i/48;painter.fillRect(x,top-6,1,i%4===0?5:2);painter.fillRect(x,bottom+2,1,i%4===0?5:2);}
  if(active){
    const item=session;item.analyser.getFloatTimeDomainData(item.samples);
    if(timestamp-lastLevelUpdate>140){
      item.rawAnalyser.getFloatTimeDomainData(item.rawSamples);
      const raw=measure(item.rawSamples),processed=measure(item.samples);
      showMeter('input',raw.db);showMeter('level',processed.db);
      $('peakState').textContent=`Compressor: ${Math.abs(item.compressor.reduction).toFixed(1)} dB de redução · Limitador: ${Math.abs(item.limiterReduction).toFixed(1)} dB de redução.`;
      if(raw.peak>=.985)item.lastClip=timestamp;
      const clipping=timestamp-(item.lastClip||-10000)<2000, overloaded=item.limiterReduction<-6;
      $('signalWarning').hidden=(!clipping&&!overloaded)||!!item.calibration;
      $('signalWarning').textContent=clipping?'Entrada perto do limite digital: reduza o nível do microfone no sistema. O tratamento não recupera áudio que já chegou distorcido.':overloaded?'O limitador está trabalhando muito. Reduza o ganho da voz para preservar a naturalidade.':'';
      const seconds=Math.max(0,Math.floor(item.context.currentTime-(item.startedAt||0)));
      $('sessionTime').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      lastLevelUpdate=timestamp;
    }
  }
  const gradient=painter.createLinearGradient(0,0,width,0);
  gradient.addColorStop(0,'#238e9c');gradient.addColorStop(.2,'#59e4e7');gradient.addColorStop(.55,'#c7ffff');gradient.addColorStop(.82,'#59e4e7');gradient.addColorStop(1,'#d87fae');
  painter.strokeStyle=gradient;painter.fillStyle=gradient;painter.lineWidth=1.8;
  painter.shadowColor='#35e1e2';painter.shadowBlur=active?9:5;
  if($('mode').value==='bars'&&active){
    session.analyser.getByteFrequencyData(session.frequencies);
    const count=Math.max(24,Math.min(76,Math.floor(width/12)));
    const binHz=session.context.sampleRate/session.analyser.fftSize,maxHz=Math.min(12000,session.context.sampleRate/2),step=width/count;
    for(let i=0;i<count;i++){
      const low=Math.floor(60*(maxHz/60)**(i/count)/binHz),high=Math.max(low+1,Math.ceil(60*(maxHz/60)**((i+1)/count)/binHz));
      let value=0;
      for(let k=low;k<Math.min(high,session.frequencies.length);k++)value=Math.max(value,session.frequencies[k]);
      const barHeight=Math.max(1,value/255*(bottom-top));
      painter.globalAlpha=.84;painter.fillRect(i*step+1,bottom-barHeight,Math.max(1,step-4),barHeight);
      painter.globalAlpha=1;painter.fillStyle='#c5ffff';painter.fillRect(i*step+1,bottom-barHeight,Math.max(1,step-4),1);painter.fillStyle=gradient;
    }
  }else{
    painter.beginPath();
    if(active){
      const samples=session.samples,visualGain=Number($('sensitivity').value);
      for(let i=0;i<samples.length;i++){
        const x=i/(samples.length-1)*width,y=middle-clamp(samples[i]*visualGain,-1,1)*(height/2-24);
        if(i===0)painter.moveTo(x,y);else painter.lineTo(x,y);
      }
    }else{painter.moveTo(0,middle);painter.lineTo(width,middle);}
    painter.stroke();
    if(!active){painter.fillStyle='#a9f8eb';painter.fillRect(width/2-2,middle-2,4,4);}
  }
  painter.globalAlpha=1;painter.shadowBlur=0;
}

let lastPaint=0;
function animate(timestamp=performance.now()) {
  if(!session?.analyser)return;
  if(timestamp-lastPaint>=30){draw(timestamp);lastPaint=timestamp;}
  frameId=requestAnimationFrame(animate);
}
$('voicePreset').addEventListener('change',selectVoiceProfile);
$('effectEnabled').addEventListener('change',()=>{comparingOriginal=false;updateVoiceEffect();});
for(const id of ['effectMix','voicePitch'])$(id).addEventListener('input',updateVoiceEffect);
$('compareVoice').addEventListener('click',()=>{if($('compareVoice').disabled)return;comparingOriginal=!comparingOriginal;updateVoiceEffect();});
$('listenVoice').addEventListener('click',()=>chooseMonitor(!monitorWanted));
$('monitorToggle').addEventListener('click',()=>chooseMonitor(!monitorWanted));
$('captureToggle').addEventListener('click',()=>{ if(session)stop();else void start(); });
$('monitor').addEventListener('change',()=>chooseMonitor($('monitor').checked));
$('volume').addEventListener('input',()=>{try{localStorage.setItem(VOLUME_KEY,$('volume').value);}catch{}updateMonitor();});
for(const id of ['voiceGain','threshold','gateAttenuation','gateHold','gateRelease']) $(id).addEventListener('input',updateProcessing);
$('gateEnabled').addEventListener('change',updateProcessing);
$('tone').addEventListener('change',()=>{
  updateProcessing();
  if(session)feedback('noiseResult','Filtro alterado. Calibre o ambiente novamente.','warn');
});
$('calibrateNoise').addEventListener('click',()=>beginCalibration('noise'));
$('calibrateVoice').addEventListener('click',()=>beginCalibration('voice'));
$('cancelCalibration').addEventListener('click',()=>cancelCalibration());
$('sensitivity').addEventListener('input',()=>{$('sensitivityValue').textContent=`${$('sensitivity').value}×`;if(!session?.analyser)draw();});
$('mode').addEventListener('change',()=>{
  const wave=$('mode').value==='wave';$('modeCaption').textContent=wave?'FORMA DE ONDA':'ESPECTRO DE FREQUÊNCIAS';
  $('sensitivityControl').hidden=!wave;if(!session?.analyser)draw();
});
$('resume').addEventListener('click',async()=>{
  const item=session;
  try {await item?.context.resume();}
  catch{if(session===item)setStatus('Não foi possível retomar. Encerre e ative novamente.','error');}
});
window.addEventListener('pagehide',()=>stop());
navigator.mediaDevices?.addEventListener?.('devicechange',()=>{void listDevices();});
if(painter) {
  if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize',resize);
  resize();
}
updateProcessing();updateVoiceEffect();setControls('idle');updateMonitor();
if(!supported)setStatus('Use um navegador atualizado em HTTPS ou localhost. A prévia de arquivos pode bloquear o microfone.','error');
else void listDevices();
AudioOutput.init();

function describeNative(track) {
  const x=track?.getSettings?.()||{};
  const value=v=>v===true?'ativo':v===false?'desligado':'não informado';
  $('nativeStatus').textContent=`Informado pelo navegador: redução de ruído ${value(x.noiseSuppression)}; eco ${value(x.echoCancellation)}; ganho automático ${value(x.autoGainControl)}.`;
}
async function applyNativeProcessing() {
  const item=session, track=item?.stream?.getAudioTracks()[0];
  if(!track||item.applyingNative){if(!track)$('nativeStatus').textContent='Será solicitado ao ativar o microfone.';return;}
  item.applyingNative=true;setControls(item.phase);
  $('nativeStatus').textContent='Aplicando processamento na captura existente…';
  try {
    const c=track.getConstraints?.()||{};
    await track.applyConstraints({...c,noiseSuppression:$('nativeNoise').checked,
      echoCancellation:$('nativeEcho').checked,autoGainControl:false});
    if(session===item){
      describeNative(track);
      const actual=track.getSettings?.()||{};let mismatch=false;
      for(const [key,id]of [['noiseSuppression','nativeNoise'],['echoCancellation','nativeEcho']]){
        if(typeof actual[key]==='boolean'&&actual[key]!==$(id).checked){$(id).checked=actual[key];mismatch=true;}
      }
      if(mismatch){$('speechMode').value='custom';$('nativeStatus').textContent+=' O navegador manteve um ajuste diferente; os controles mostram o estado informado.';}
    }
  } catch(error) {
    if(session===item){
      const actual=track.getSettings?.()||{};
      if(typeof actual.noiseSuppression==='boolean')$('nativeNoise').checked=actual.noiseSuppression;
      if(typeof actual.echoCancellation==='boolean')$('nativeEcho').checked=actual.echoCancellation;
      $('nativeStatus').textContent=`Não foi possível aplicar (${error.name}). Confira os ajustes e reinicie a captura.`;
    }
  } finally {item.applyingNative=false;if(session===item)setControls(item.phase);}
}
async function selectSpeechMode() {
  const mode=$('speechMode').value;
  if(mode==='custom')return;
  $('gateEnabled').checked=mode==='balanced';
  $('threshold').value='-60';$('gateAttenuation').value='12';$('gateHold').value='500';$('gateRelease').value='450';
  $('nativeNoise').checked=mode!=='diagnostic';$('nativeEcho').checked=mode!=='diagnostic';
  if(mode==='diagnostic'){
    $('effectEnabled').checked=false;comparingOriginal=false;updateVoiceEffect();
    feedback('speechHint','Diagnóstico: supressão, eco, atenuação extra e efeito desligados. Use fones. Ganho e proteção de picos permanecem.','warn');
  } else feedback('speechHint',mode==='continuous'?'Sem corte por nível. Redução de ruído do navegador solicitada. O efeito de voz mantém seu ajuste atual.':'Atenuação limitada e gradual entre frases. Se perder sílabas, volte a Fala contínua.');
  updateProcessing();await applyNativeProcessing();
}
$('speechMode').addEventListener('change',()=>void selectSpeechMode());
for(const id of ['nativeNoise','nativeEcho'])$(id).addEventListener('change',()=>{$('speechMode').value='custom';void applyNativeProcessing();});
for(const id of ['gateEnabled','threshold','gateAttenuation','gateHold','gateRelease'])$(id).addEventListener(id==='gateEnabled'?'change':'input',()=>{$('speechMode').value='custom';});
// Diagnostics expose aggregate levels and settings, never raw microphone samples.
window.audioDiagnostics=()=>({version:12,phase:session?.phase||'idle',context:session?.context?.state||null,
  track:session?.stream?.getAudioTracks()[0]?.getSettings?.()||null,continuous:!$('gateEnabled').checked,
  gateGain:session?.lastMeter?.gain??null,monitor:monitorWanted,monitorAudible:monitorState().audible,monitorReason:monitorState().reason,
  effect:{profile:$('voicePreset').value,pitch:Number($('voicePitch').value),mix:Number($('effectMix').value),chorus:false,parallelDryVoice:false},
  destinationPaths:session?.monitorGain?1:0,
  processorNames:session?.nodes.filter(n=>n instanceof AudioWorkletNode).map(n=>n.constructor.name)||[]});

$('resetCleanVoice').addEventListener('click',()=>{
  $('voicePreset').value='assistant';$('effectEnabled').checked=true;
  selectVoiceProfile();
});
