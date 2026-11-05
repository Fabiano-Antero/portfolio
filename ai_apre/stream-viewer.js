'use strict';
/** Read-only player: does not call getUserMedia, share devices or load studio audio. */
(() => {
  const V=VozStream,t=V.t,$w=id=>document.getElementById(id),video=$w('watchVideo');
  const N=window.VozOnline,invite=N.parseLink(),room=invite?.room,id=V.id(),valid=!!invite;
  const state={channel:null,pc:null,pid:null,local:false,localKey:'',remote:new MediaStream(),phase:'waiting',sourcePhase:'idle',lastSource:0,started:performance.now(),liveAt:0,muted:true,sourceMuted:false,audioAvailable:false,videoPaused:false,connectingAt:0,bytes:0,statsAt:0,bitrate:0,frames:0,audioBytes:0,width:0,height:0,lastFrameAt:0,candidateCount:0,statsBusy:false,disposed:false,generation:0,ice:new Map(),message:null,playBlocked:false,events:[]};
  video.muted=true;video.defaultMuted=true;video.volume=.4;
  $w('watchEmptyIcon').innerHTML=V.icon.broadcast;
  function note(type,info={}){state.events.push({type,at:Math.round(performance.now()),...info});if(state.events.length>100)state.events.shift();}
  function post(type,data={}){if(!state.disposed)state.channel?.postMessage({v:15,from:id,to:'producer',type,pid:state.pid,...data});}
  function hello(){post('hello');}
  function setMessage(key){state.message=key;$w('watchMessage').hidden=!key;$w('watchMessage').textContent=key?t(key):'';}
  function closePeer(){
    state.generation++;
    if(state.pc){state.pc.onconnectionstatechange=null;state.pc.onicecandidate=null;state.pc.ontrack=null;state.pc.close();state.pc=null;}
    state.pid=null;if(!state.local)state.remote.getTracks().forEach(x=>x.stop());state.remote=new MediaStream();state.local=false;state.localKey='';
    video.srcObject=null;state.bytes=0;state.statsAt=0;state.bitrate=0;state.frames=0;state.audioBytes=0;state.width=0;state.height=0;state.lastFrameAt=0;state.playBlocked=false;state.ice.clear();
  }

  async function accept(m){


    if(m.pid===state.pid)return;
    if(!V.validId(m.pid)||m.description?.type!=='offer'||typeof m.description.sdp!=='string'||m.description.sdp.length>100000)return;
    const pending=state.ice.get(m.pid)||[];closePeer();
    state.phase='connecting';state.pid=m.pid;state.connectingAt=performance.now();
    const generation=state.generation,pc=new RTCPeerConnection(state.channel.rtcConfig);state.pc=pc;
    state.ice.set(m.pid,pending);
    pc.onicecandidate=e=>{if(e.candidate&&state.pc===pc){state.candidateCount++;post('ice',{candidate:e.candidate.toJSON()});}};
    pc.ontrack=e=>{
      if(state.pc!==pc)return;
      if(!state.remote.getTracks().some(x=>x.id===e.track.id))state.remote.addTrack(e.track);
      if(video.srcObject!==state.remote)video.srcObject=state.remote;
      video.play().then(()=>{state.playBlocked=false;render();}).catch(()=>{state.playBlocked=true;render();});
      note('track',{kind:e.track.kind});
    };
    pc.onconnectionstatechange=()=>{
      if(state.pc!==pc)return;
      if(pc.connectionState==='connected'){state.phase='connected';note('connected');}
      if(pc.connectionState==='disconnected'){state.phase='connecting';state.connectingAt=performance.now();}
      if(['failed','closed'].includes(pc.connectionState)){post('retry');closePeer();state.phase='connecting';hello();}
      render();
    };
    try{
      await pc.setRemoteDescription(m.description);if(generation!==state.generation)return;
      for(const c of (state.ice.get(m.pid)||[]).splice(0))await pc.addIceCandidate(c);
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      if(generation!==state.generation)return;
      post('answer',{description:pc.localDescription.toJSON()});note('answer');
    }catch(e){if(state.pc===pc){note('answer-error',{name:e.name});post('retry');closePeer();state.phase='connecting';}}
    render();
  }
  async function handle(e){
    const m=e.data;if(!m||m.v!==15||m.from!=='producer'||m.to&&m.to!==id)return;
    state.lastSource=performance.now();
    if(m.type==='status'){
      state.sourcePhase=m.phase;state.liveAt=Number(m.startedAt)||0;state.sourceMuted=!!m.muted;state.videoPaused=!!m.videoPaused;state.audioAvailable=!!m.audioAvailable;
      if(m.phase==='live'){
        if(!state.pc&&!state.local&&state.phase!=='limit')state.phase='connecting';
      }else if(!state.pc&&!state.local){state.phase=m.phase==='preview'?'previewWait':state.phase==='ended'?'ended':'waiting';}
    }else if(m.type==='offer')await accept(m);
    else if(m.type==='ice'&&V.validId(m.pid)&&m.candidate&&typeof m.candidate.candidate==='string'&&m.candidate.candidate.length<3000){
      try{
        if(state.pc&&state.pid===m.pid&&state.pc.remoteDescription)await state.pc.addIceCandidate(m.candidate);
        else{if(state.ice.size>3)state.ice.clear();const q=state.ice.get(m.pid)||[];if(q.length<128)q.push(m.candidate);state.ice.set(m.pid,q);}
      }catch(e){note('ice-error',{name:e.name});}
    }else if(m.type==='stop'){closePeer();state.phase='ended';state.liveAt=0;note('source-stopped');}
    else if(m.type==='retry'){closePeer();state.phase='connecting';hello();}
    else if(m.type==='limit'){closePeer();state.phase='limit';}
    render();
  }
  async function stats(){
    if(state.local){state.frames=video.getVideoPlaybackQuality?.().totalVideoFrames||state.frames;state.width=video.videoWidth;state.height=video.videoHeight;return;}
    if(state.statsBusy||!state.pc||state.pc.connectionState!=='connected')return;state.statsBusy=true;const pc=state.pc;
    try{let bytes=0,frames=0,audioBytes=0;const report=await pc.getStats();
      if(state.pc!==pc)return;
      report.forEach(r=>{if(r.type==='inbound-rtp'){
        if(r.kind==='video'||r.mediaType==='video'){bytes+=r.bytesReceived||0;frames+=r.framesDecoded||0;state.width=r.frameWidth||state.width;state.height=r.frameHeight||state.height;}
        if(r.kind==='audio'||r.mediaType==='audio')audioBytes+=r.bytesReceived||0;
      }});
      const now=performance.now();state.bitrate=state.statsAt&&bytes>=state.bytes?(bytes-state.bytes)*8/(now-state.statsAt):0;
      state.bytes=bytes;state.statsAt=now;state.frames=frames;state.audioBytes=audioBytes;
    }catch{}finally{state.statsBusy=false;}
  }
  function render(){
    const connected=state.phase==='connected'&&(state.local||state.pc?.connectionState==='connected');
    const hasVideo=connected&&video.readyState>=2&&!state.videoPaused&&!state.playBlocked;
    $w('watchEmpty').hidden=hasVideo;
    let title='waiting',body='waitingBody';
    if(state.phase==='invalid'){title='invalid';body='invalidBody';}
    else if(state.phase==='unsupported'){title='unsupported';body='noCapture';}
    else if(state.phase==='ended'){title='ended';body='waitingBody';}
    else if(state.phase==='sourceGone'){title='sourceGone';body='sourceGoneBody';}
    else if(state.phase==='previewWait'){title='previewWait';body='previewWaitBody';}
    else if(state.phase==='limit'){title='limit';body='limitBody';}
    else if(state.phase==='noSource'){title='noSource';body='noSourceBody';}
    else if(state.videoPaused&&connected){title='videoPaused';body='noCapture';}
    else if(state.playBlocked){title='playerPaused';body='noCapture';}
    else if(state.phase==='connecting'||connected){title='connecting';body='waitingBody';}
    $w('watchTitle').textContent=t(title);$w('watchDescription').textContent=t(body);
    $w('watchPlay').hidden=!state.playBlocked;
    $w('watchBadge').textContent=t(connected?'connected':state.phase==='connecting'?'connecting':'offline');$w('watchBadge').dataset.live=String(connected);
    const w=video.videoWidth||state.width,h=video.videoHeight||state.height;
    $w('watchResolutionBadge').textContent=w?`${w}×${h}`:'—';
    $w('watchSignal').textContent=connected?(state.local?'LOCAL':'WEBRTC'):'—';$w('watchTimer').textContent=V.time(state.liveAt&&state.sourcePhase==='live'?(Date.now()-state.liveAt)/1000:0);
    const transportLabel=$w('watchBitrate').parentElement.querySelector('small');transportLabel.removeAttribute('data-st');transportLabel.textContent=t(state.local?'transport':'receiving');
    $w('watchBitrate').textContent=connected?(state.local?'LOCAL':`${Math.round(state.bitrate)} kbps`):'—';$w('watchFrames').textContent=String(state.frames);
    $w('watchMutedFlag').textContent=state.sourceMuted?t('audioMuted'):!state.audioAvailable&&connected?t('noAudio'):'';
    $w('watchSound').removeAttribute('data-st');$w('watchSound').textContent=t(state.muted?'soundOff':'soundOn');$w('watchSound').setAttribute('aria-pressed',String(!state.muted));
    $w('watchSound').disabled=!connected||!state.audioAvailable;$w('watchVolume').disabled=!connected;
    $w('watchReconnect').disabled=!valid||!window.RTCPeerConnection;
    $w('watchLanguage').value=V.lang;document.documentElement.lang=V.lang;document.title=`VOZ // ${t('playerTitle')}`;
    $w('watchFullscreen').removeAttribute('data-st');$w('watchFullscreen').textContent=t(document.fullscreenElement?'exitFullscreen':'fullscreen');
  }
  async function connectSignal(){
    if(!valid||state.disposed)return;
    state.channel?.close();closePeer();state.phase='connecting';state.lastSource=0;state.started=performance.now();
    let channel;
    channel=new N.Signal({room,token:invite.token,role:'viewer',clientId:id,onState:(phase,code)=>{
      if(state.channel!==channel||state.disposed)return;
      if(phase==='connected'){setMessage(channel.relayAvailable?null:'directWarning');state.phase='waiting';hello();}
      else if(phase==='ended'){
        closePeer();state.phase=code==='VIEWER_LIMIT'?'limit':'ended';
        setMessage(code==='AUTH_REQUIRED'?'viewerDenied':code==='VIEWER_LIMIT'?'limitBody':'endedLink');
      }else{state.phase='connecting';setMessage(phase==='reconnecting'?'onlineReconnecting':null);}
      render();
    }});
    state.channel=channel;channel.onmessage=handle;
    try{await channel.open();hello();}
    catch(e){
      channel.close();if(state.channel!==channel)return;
      const messages={NOT_CONFIGURED:'serverMissing',AUTH_REQUIRED:'viewerDenied',ROOM_ENDED:'endedLink',VIEWER_LIMIT:'limitBody',TURN_NOT_CONFIGURED:'turnError',TURN_UNAVAILABLE:'turnError',RATE_LIMIT:'rateLimit',SESSION_LIMIT:'sessionLimit'};
      state.phase=e.code==='VIEWER_LIMIT'?'limit':'ended';setMessage(messages[e.code]||'networkError');render();
    }
  }
  $w('watchSound').addEventListener('click',async()=>{
    state.muted=!state.muted;video.muted=state.muted;
    try{await video.play();state.playBlocked=false;setMessage(null);}
    catch{state.muted=true;video.muted=true;setMessage('soundBlocked');}
    render();
  });
  $w('watchVolume').addEventListener('input',()=>{video.volume=Number($w('watchVolume').value);$w('watchVolumeValue').textContent=`${Math.round(video.volume*100)}%`;$w('watchVolume').style.setProperty('--fill',`${video.volume*100}%`);});
  $w('watchPlay').addEventListener('click',async()=>{try{await video.play();state.playBlocked=false;}catch{}render();});
  $w('watchReconnect').addEventListener('click',()=>{post('bye');closePeer();state.phase='waiting';state.lastSource=0;state.started=performance.now();void connectSignal();render();});
  $w('watchFullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $w('watchPlayer').requestFullscreen();}catch{setMessage('fullscreenBlocked');}});
  document.addEventListener('fullscreenchange',render);
  $w('watchLanguage').addEventListener('change',()=>V.language($w('watchLanguage').value,true));
  window.addEventListener('voz:streamlanguage',()=>{V.translate();render();setMessage(state.message);});
  for(const name of ['playing','loadeddata','resize'])video.addEventListener(name,render);
  if(!valid)state.phase='invalid';
  else if(!window.isSecureContext||!window.RTCPeerConnection)state.phase='unsupported';
  else void connectSignal();

  const heartbeat=setInterval(()=>{
    if(!state.channel||state.disposed||!state.channel.ready)return;hello();
    const now=performance.now();
    if(state.lastSource&&now-state.lastSource>10000){if(state.pc||state.local)closePeer();state.phase='sourceGone';state.liveAt=0;}
    else if(!state.lastSource&&now-state.started>7000)state.phase='noSource';
    if(state.pc&&state.pc.connectionState!=='connected'&&now-state.connectingAt>30000){post('retry');closePeer();setMessage('connectionFailed');}
    void stats();render();
  },1500);
  window.addEventListener('pagehide',()=>{post('bye');state.disposed=true;clearInterval(heartbeat);closePeer();state.channel?.close();});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  window.viewerDiagnostics=()=>({version:15,phase:state.phase,room,transport:state.local?'shared-local':'webrtc',connection:state.local?'connected':state.pc?.connectionState||null,ice:state.pc?.iceConnectionState||null,signaling:state.pc?.signalingState||null,gathering:state.pc?.iceGatheringState||null,localCandidates:state.candidateCount,videoWidth:video.videoWidth,videoHeight:video.videoHeight,readyState:video.readyState,muted:video.muted,volume:video.volume,framesDecoded:state.frames,bytesReceived:state.bytes,audioBytesReceived:state.audioBytes,remoteTracks:state.remote.getTracks().map(x=>({kind:x.kind,readyState:x.readyState,muted:x.muted})),cameraRequests:0,events:state.events.map(x=>({...x}))});
  V.translate();render();$w('watchVolume').style.setProperty('--fill','40%');
})();
