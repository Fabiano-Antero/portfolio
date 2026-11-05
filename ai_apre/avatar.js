'use strict';
/**
 * v10 — Preserve original playback, ease only the return to the first-frame pose.
 * Whole-portrait, bidirectional motion alignment. Interrupted returns reverse
 * from their current progress; no jump to another expression or mouth overlay.
 * This is speech activity control, not phonetic lip-sync.
 */
(() => {
  const assets=JSON.parse($('avatar-assets').textContent);
  const video=$('avatarVideo'), rest=$('avatarRest'), card=$('avatarCard');
  const REST_TIME=Number(assets.restTime)||0;
  const phrases=[[.5,1.85],[2.9,5.25],[6.45,7.05]];
  const portrait=new PortraitReturn($('avatarTransition'),rest,assets);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const smoothstep=(x)=>x*x*(3-2*x);
  let samples=new Float32Array(1024);
  const state={
    ready:false,videoReady:false,imageReady:false,failed:false,destroyed:false,
    phase:'loading',source:'idle',wants:false,voiced:false,envelope:0,db:-120,
    lastVoice:-Infinity,level:0,demoStart:0,demoUntil:0,reference:false,
    referenceEnded:false,frame:0,mediaFrame:0,lastSession:null,history:[],
    lastTick:0,lastLabel:0,raf:0,vfc:null,playPending:false,generation:0,
    needsGesture:false,referenceFrames:0,presentedFrames:0,seeks:0,loops:0,
    starts:0,pauses:0,idleReturns:0,restLatched:true,resetting:false,
    playbackErrors:[],events:[],videoURL:null,posterURL:null,
    transition:null,transitionFrames:0,transitionStarts:0,transitionReversals:0,
    startingRenderer:false,rendererReady:false
  };
  function note(type,extra={}){
    state.events.push({type,at:Math.round(performance.now()),frame:state.frame,...extra});
    if(state.events.length>120)state.events.shift();
  }
  function resetSignal(){
    state.envelope=0;state.db=-120;state.level=0;state.voiced=false;
    state.lastVoice=-Infinity;state.history.length=0;
  }
  function labels(){
    $('mouthThresholdValue').textContent=`${$('mouthThreshold').value} dBFS`;
    $('phraseHoldValue').textContent=`${$('phraseHold').value} ms`;
    $('mouthDelayValue').textContent=`${$('mouthDelay').value} ms`;
    $('returnDurationValue').textContent=`${$('returnDuration').value} ms`;
    syncRangeFills();
  }
  function showRest(){
    // Exactly one whole-portrait surface is visible.
    portrait.hide();video.hidden=true;rest.hidden=false;
    card.dataset.state=state.ready?'rest':'loading';
    card.dataset.speaking='false';
  }
  function mayPlay(){
    return state.ready&&!state.failed&&!state.destroyed&&!document.hidden&&
      !state.restLatched&&!state.transition&&(state.wants||state.reference);
  }
  function showMotion(){
    if(!mayPlay()||video.seeking||state.resetting||video.paused||video.readyState<2)return;
    portrait.hide();rest.hidden=true;video.hidden=false;
    state.phase=state.reference?'reference':'talking';
    card.dataset.state=state.phase;
  }
  function seekStart(reason){
    if(video.readyState<1)return;
    state.resetting=true;state.seeks++;note('seek-start',{to:REST_TIME,reason});
    try{
      // A NEW seek to 0 replaces any previous pending seek. Never fastSeek().
      video.currentTime=REST_TIME;
      if(!video.seeking)state.resetting=false;
    }catch(error){
      state.resetting=false;state.playbackErrors.push(`seek:${error.name}`);
    }
  }
  function finishRest(reason='silence',force=false){
    const changed=!state.restLatched||!video.paused||state.playPending||!!state.transition;
    state.transition=null;
    if(changed||force){
      state.generation++;state.playPending=false;
      if(!state.restLatched)state.idleReturns++;
      note('return-rest',{reason,fromTime:video.currentTime,to:REST_TIME});
    }
    state.restLatched=true;state.wants=false;state.level=0;state.frame=0;
    state.phase=state.ready?'idle':'loading';showRest();
    if(!video.paused){video.pause();state.pauses++;}
    if((changed||force||(!state.resetting&&!video.seeking))&&
       (Math.abs(video.currentTime-REST_TIME)>.001||video.seeking))seekStart(reason);
  }
  function returnRest(reason='silence',force=false){
    const immediate=force||document.hidden||state.destroyed||!state.ready||
      ['pagehide','media-error','hidden-tab','initial-pose','reference-start','demo-start'].includes(reason);
    state.wants=false;state.level=0;
    if(immediate){finishRest(reason,force);return;}
    if(state.transition){state.transition.goal=1;return;}
    if(state.restLatched||video.hidden||!portrait.available){finishRest(reason);return;}
    // Snapshot BEFORE pause or seek: the transition starts at the exact visible frame.
    const frame=('requestVideoFrameCallback' in video)?state.mediaFrame:Math.floor(video.currentTime*assets.fps);
    if(!portrait.capture(video,frame)){finishRest(reason);return;}
    state.generation++;state.playPending=false;
    if(!video.paused){video.pause();state.pauses++;}
    const duration=clamp(Number($('returnDuration').value),160,600);
    state.transition={position:0,goal:1,elapsed:0,duration:reducedMotion.matches?Math.min(160,duration):duration,
      lastAt:performance.now(),reason,fromFrame:frame,fromTime:video.currentTime};
    state.phase='returning';state.transitionStarts++;
    video.hidden=true;rest.hidden=true;portrait.show();card.dataset.state='returning';
    note('transition-start',{reason,fromFrame:frame,duration:state.transition.duration});
  }
  function stepTransition(now){
    const t=state.transition;if(!t)return;
    if(!portrait.available||portrait.lost){finishRest('renderer-unavailable');return;}
    const dt=Math.max(0,Math.min(100,now-t.lastAt));t.lastAt=now;
    t.position=clamp(t.position+(t.goal===1?1:-1)*dt/t.duration,0,1);t.elapsed+=dt;
    portrait.draw(smoothstep(t.position));state.transitionFrames++;
    video.hidden=true;rest.hidden=true;portrait.show();
    state.phase=t.goal===1?'returning':'resuming';card.dataset.state=state.phase;
    if(t.goal===1&&t.position>=1){
      note('transition-complete',{duration:Math.round(t.elapsed),fromFrame:t.fromFrame});finishRest(t.reason);
    }else if(t.goal===0&&t.position<=0){
      // The source frame is restored exactly. Resume the same paused source video.
      note('transition-resumed',{fromFrame:t.fromFrame});state.transition=null;
      state.restLatched=false;state.wants=true;state.phase='starting';
      // Keep the compositor's original frame visible until play() presents a frame.
      void play();
    }
  }
  function clearDemo(){
    state.demoStart=0;state.demoUntil=0;
    $('avatarDemo').textContent='Testar fala e pausas';
    $('avatarDemo').setAttribute('aria-pressed','false');
    $('avatarDemoLabel').hidden=true;card.dataset.demo='false';resetSignal();
  }
  function stopReference(reason='reference-stopped'){
    state.reference=false;
    $('compareOriginal').setAttribute('aria-pressed','false');
    $('compareOriginal').textContent='Ver vídeo original';
    returnRest(reason);resetSignal();
  }
  async function play(){
    if(!mayPlay()||state.needsGesture||state.playPending||video.seeking||state.resetting)return;
    if(!video.paused){showMotion();return;}
    const generation=state.generation;
    state.playPending=true;
    try{
      video.playbackRate=1;
      await video.play();
      // A stale play promise must not undo a newer return-to-rest operation.
      if(generation!==state.generation){if(!mayPlay())video.pause();return;}
      if(!mayPlay()){video.pause();if(!state.transition)showRest();return;}
      state.needsGesture=false;state.starts++;note('play');showMotion();
    }catch(error){
      if(generation===state.generation&&error.name!=='AbortError'){
        state.playbackErrors.push(error.name);state.needsGesture=true;showRest();
        $('avatarHelp').textContent='O navegador bloqueou a reprodução. Clique em Testar fala e pausas ou reative o microfone.';
      }
    }finally{if(generation===state.generation)state.playPending=false;}
  }
  function readSignal(now,dt){
    const item=session;
    if(item!==state.lastSession){
      clearDemo();stopReference('capture-changed');state.lastSession=item;resetSignal();
    }
    if(state.reference)return {active:true,speaking:true,level:0,source:'reference'};
    const analyser=item?.speechAnalyser;
    const active=!!(analyser&&item.phase==='live'&&item.context.state==='running'&&
      !item.calibration&&!item.stream?.getAudioTracks()[0]?.muted);
    if(active){
      if(samples.length!==analyser.fftSize)samples=new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      let energy=0;for(let i=0;i<samples.length;i++)energy+=samples[i]*samples[i];
      const rms=Math.sqrt(energy/samples.length);
      state.envelope+=(rms-state.envelope)*(1-Math.exp(-dt/(rms > state.envelope ? .008 : .025)));
      state.db=20*Math.log10(Math.max(1e-6,state.envelope));
      const threshold=Number($('mouthThreshold').value);
      const level=clamp((state.db+65)/53,0,1);
      if(state.db>=threshold+3){state.voiced=true;state.lastVoice=now;}
      else if(state.voiced&&state.db>=threshold){state.lastVoice=now;}
      if(now-state.lastVoice>Number($('phraseHold').value))state.voiced=false;
      return {active:true,speaking:state.voiced,level,source:'microphone'};
    }
    if(state.demoUntil>now){
      const seconds=(now-state.demoStart)/1000;
      const speaking=phrases.some(([a,b])=>seconds>=a&&seconds<b);
      return {active:true,speaking,level:speaking ? .45 + .15*Math.sin(seconds*7) : 0,source:'demo'};
    }
    if(state.demoUntil)clearDemo();
    resetSignal();return {active:false,speaking:false,level:0,source:'idle'};
  }
  function delayed(signal,now){
    if(!signal.active||signal.source==='reference'){state.history.length=0;return signal;}
    const delay=Number($('mouthDelay').value);
    if(!delay){state.history.length=0;return signal;}
    state.history.push({at:now,...signal});
    while(state.history.length>1&&state.history[1].at<now-900)state.history.shift();
    for(let i=state.history.length-1;i>=0;i--)if(state.history[i].at<=now-delay)return state.history[i];
    return {...signal,speaking:false,level:0};
  }
  function control(signal){
    state.source=signal.source;state.level=signal.level;
    if(state.reference){state.wants=true;void play();return;}
    const enabled=$('avatarEnabled').checked;
    if(!enabled||!signal.active||!signal.speaking){
      returnRest(!enabled?'disabled':!signal.active?'inactive':'silence');return;
    }
    if(state.transition){
      state.wants=true;
      if(state.transition.goal!==0){state.transition.goal=0;state.transitionReversals++;note('transition-reverse');}
      return;
    }
    if(state.restLatched){
      state.restLatched=false;state.generation++;state.playPending=false;
      state.phase='starting';state.wants=true;
      // Normally the idle operation already rewound the video. Keep this guard
      // for a rapid stop/start, an external seek or a late decoder callback.
      if(!state.resetting&&!video.seeking&&Math.abs(video.currentTime-REST_TIME)>.001)seekStart('new-phrase');
    }else state.wants=true;
    if((video.ended||video.currentTime>=assets.activeEndFrame/assets.fps)&&!video.seeking&&!state.resetting){
      seekStart('speaking-cycle');state.loops++;
    }
    void play();
  }
  function onVideoFrame(now,metadata){
    state.mediaFrame=Math.max(0,Math.min(assets.frames-1,Math.round(metadata.mediaTime*assets.fps)));
    state.frame=state.restLatched?0:state.mediaFrame;state.presentedFrames++;
    if(state.reference)state.referenceFrames++;
    if(!state.transition){if(state.restLatched)showRest();else showMotion();}
    if(!state.destroyed)state.vfc=video.requestVideoFrameCallback(onVideoFrame);
  }
  function status(now){
    if(now-state.lastLabel<100)return;state.lastLabel=now;
    const busy=!!session;
    $('avatarDemo').disabled=!state.ready||busy||state.reference||!$('avatarEnabled').checked;
    $('compareOriginal').disabled=!state.ready||busy;
    const text=state.failed?'ERRO NO VÍDEO':!state.ready?'CARREGANDO':state.needsGesture?'CLIQUE PARA INICIAR':
      state.reference?'ORIGINAL':!$('avatarEnabled').checked?'EM REPOUSO':
      state.phase==='returning'?'RETORNANDO':state.phase==='resuming'?'RETOMANDO':state.phase==='talking'?'FALANDO':busy?'ESCUTANDO':'EM REPOUSO';
    $('avatarState').textContent=text;
    card.dataset.speaking=String(state.phase==='talking');card.dataset.renderer='smooth-return-v9';
    $('avatarCaption').textContent=state.reference?'Vídeo original · sem controle da fala':
      state.phase==='returning'?'Voltando à pose inicial':state.phase==='resuming'?'Retomando sua fala':state.phase==='talking'?'Acompanhando sua fala':'Pose inicial · boca fechada';
    $('avatarSource').textContent=`Retorno suave · ${$('returnDuration').value} ms`;
    $('mouthPercent').textContent=`${Math.round(state.level*100)}%`;
    $('mouthMeterFill').style.transform=`scaleX(${state.level})`;
  }
  function tick(now){
    if(state.destroyed)return;
    state.raf=requestAnimationFrame(tick);
    if(document.hidden)return;
    const dt=clamp((now-(state.lastTick||now-16.67))/1000,.001,.1);state.lastTick=now;
    if(!('requestVideoFrameCallback' in video))state.frame=state.restLatched?0:Math.round(video.currentTime*assets.fps);
    const signal=delayed(readSignal(now,dt),now);
    if(state.ready)control(signal);stepTransition(now);status(now);
  }
  $('avatarDemo').addEventListener('click',()=>{
    if(session||!state.ready)return;
    if(state.demoUntil){clearDemo();returnRest('demo-stopped');return;}
    stopReference('demo-start');resetSignal();state.needsGesture=false;
    state.demoStart=performance.now();state.demoUntil=state.demoStart+8400;
    $('avatarDemo').textContent='Encerrar teste';$('avatarDemo').setAttribute('aria-pressed','true');
    $('avatarDemoLabel').hidden=false;card.dataset.demo='true';
    $('avatarHelp').textContent='Três falas de durações diferentes, com retorno gradual à mesma pose inicial. Teste sem som.';
    closeSettings();
  });
  $('compareOriginal').addEventListener('click',()=>{
    if(session||!state.ready)return;
    if(state.reference){stopReference();return;}
    clearDemo();returnRest('reference-start',true);
    state.reference=true;state.referenceEnded=false;state.restLatched=false;
    state.wants=true;state.needsGesture=false;state.generation++;
    $('compareOriginal').textContent='Encerrar original';$('compareOriginal').setAttribute('aria-pressed','true');
    $('avatarHelp').textContent='O original é exibido sem controle pelo áudio. Ao encerrar ou chegar ao fim, volta à pose inicial.';
    closeSettings();void play();
  });
  $('avatarEnabled').addEventListener('change',()=>{
    clearDemo();stopReference('avatar-toggled');state.needsGesture=false;
  });
  for(const id of ['mouthThreshold','phraseHold','mouthDelay','returnDuration'])$(id).addEventListener('input',()=>{
    labels();if(id==='mouthDelay')state.history.length=0;
  });
  $('resetAvatar').addEventListener('click',()=>{
    $('mouthThreshold').value='-48';$('phraseHold').value='180';$('mouthDelay').value='0';$('returnDuration').value='320';$('avatarEnabled').checked=true;
    clearDemo();stopReference('settings-reset');state.needsGesture=false;labels();
    $('avatarHelp').textContent='Ajustes restaurados. Ao terminar a fala, o avatar retorna em 320 ms ao primeiro quadro.';
  });
  $('captureToggle').addEventListener('click',()=>{state.needsGesture=false;if(!session){clearDemo();stopReference('capture-stopped');}});

  async function ready(){
    if(state.ready||state.startingRenderer||state.failed||!state.videoReady||!state.imageReady)return;
    state.startingRenderer=true;await portrait.initialize();state.rendererReady=true;
    if(state.destroyed||state.failed)return;
    state.ready=true;finishRest('initial-pose',true);$('avatarError').hidden=true;note('ready',{renderer:portrait.mode});status(performance.now()+101);
    if(portrait.mode!=='motion-aligned')$('avatarHelp').textContent='Alinhamento gráfico indisponível neste dispositivo. O retorno usa uma transição simples do retrato inteiro.';
  }
  video.addEventListener('loadeddata',()=>{state.videoReady=true;ready();},{once:true});
  rest.addEventListener('load',()=>{state.imageReady=true;ready();},{once:true});
  function mediaError(){
    state.failed=true;state.ready=false;returnRest('media-error');$('avatarError').hidden=false;
    $('avatarHelp').textContent='Não foi possível abrir o vídeo ou a pose inicial. Extraia a pasta completa ou use o HTML único.';
  }
  video.addEventListener('error',mediaError);rest.addEventListener('error',mediaError);
  video.addEventListener('seeked',()=>{
    state.resetting=false;
    if(state.restLatched){
      video.pause();state.frame=0;showRest();
      if(Math.abs(video.currentTime-REST_TIME)>.001)seekStart('late-seek-while-idle');
    }else if(mayPlay()){void play();showMotion();}
  });
  video.addEventListener('playing',()=>{if(state.transition){video.pause();return;}if(mayPlay())showMotion();else returnRest('late-playing-event');});
  video.addEventListener('ended',()=>{
    if(state.reference){stopReference('reference-ended');state.referenceEnded=true;}
    else if(state.wants&&!state.restLatched){seekStart('ended-while-speaking');state.loops++;void play();}
    else returnRest('video-ended');
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){clearDemo();stopReference('hidden-tab');resetSignal();}
    else{state.lastTick=0;state.lastSession=session;}
  });
  function localURL(value){
    if(!value.startsWith('data:'))return value;
    const comma=value.indexOf(','),mime=value.slice(5,value.indexOf(';'));
    const raw=atob(value.slice(comma+1)),chunks=[];
    for(let start=0;start<raw.length;start+=65536){
      const part=raw.slice(start,start+65536),bytes=new Uint8Array(part.length);
      for(let i=0;i<part.length;i++)bytes[i]=part.charCodeAt(i);chunks.push(bytes);
    }
    return URL.createObjectURL(new Blob(chunks,{type:mime}));
  }
  video.muted=true;video.defaultMuted=true;video.volume=0;video.playsInline=true;video.loop=false;
  state.videoURL=localURL(assets.video);state.posterURL=localURL(assets.poster);
  showRest();rest.src=state.posterURL;video.poster=state.posterURL;video.src=state.videoURL;video.load();
  if('requestVideoFrameCallback' in video)state.vfc=video.requestVideoFrameCallback(onVideoFrame);
  window.addEventListener('pagehide',()=>{
    returnRest('pagehide');state.destroyed=true;video.pause();cancelAnimationFrame(state.raf);
    if(state.vfc!==null&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(state.vfc);
    portrait.dispose();
    for(const url of [state.videoURL,state.posterURL])if(url?.startsWith('blob:'))URL.revokeObjectURL(url);
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  // Read-only diagnostics: no microphone recordings or audio samples are exposed.
  window.avatarDiagnostics=()=>({version:12,ready:state.ready,phase:state.phase,source:state.source,
    frame:state.frame,mediaFrame:state.mediaFrame,time:video.currentTime,rate:video.playbackRate,
    paused:video.paused,speaking:state.wants,db:state.db,level:state.level,restFrame:0,
    restVisible:!rest.hidden,videoVisible:!video.hidden,resetting:state.resetting,
    presentedFrames:state.presentedFrames,seeks:state.seeks,loops:state.loops,
    starts:state.starts,pauses:state.pauses,idleReturns:state.idleReturns,
    reference:state.reference,referenceEnded:state.referenceEnded,
    playbackErrors:[...state.playbackErrors],events:state.events.map(e=>({...e})),
    renderer:portrait.mode,rendererFailure:portrait.failure,transitionVisible:!portrait.canvas.hidden,
    transitionProgress:state.transition?.position??null,transitionGoal:state.transition?.goal??null,
    transitionFromFrame:state.transition?.fromFrame??null,transitionStarts:state.transitionStarts,
    transitionFrames:state.transitionFrames,transitionReversals:state.transitionReversals,
    canvasLayers:Number(!portrait.canvas.hidden),visiblePortraits:Number(!video.hidden)+Number(!rest.hidden)+Number(!portrait.canvas.hidden),
    originalDuringSpeech:true,restIsOriginalFirstFrame:true});
  labels();state.raf=requestAnimationFrame(tick);
})();
