'use strict';
/**
 * v15 online streaming module. Only this page captures devices.
 * Existing studio DSP is tapped after the limiter and BEFORE monitor volume.
 * Nothing here changes the studio return preference, FX or portrait controller.
 * WebRTC transports real media; the Cloudflare Worker carries authenticated signaling.
 */
(() => {
  const V=window.VozStream, t=V.t, $s=id=>document.getElementById(id);
  const trigger=document.createElement('button');
  trigger.id='streamTrigger';trigger.type='button';trigger.className='settings-trigger stream-trigger';
  trigger.setAttribute('data-i18n-ignore','');trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-controls','streamDialog');trigger.setAttribute('aria-expanded','false');
  trigger.dataset.stLabel='open';trigger.dataset.stTitle='open';trigger.innerHTML=V.icon.broadcast;
  document.querySelector('.utility-dock').prepend(trigger);
  const dialog=document.createElement('dialog');dialog.id='streamDialog';dialog.className='st-dialog';
  dialog.setAttribute('data-i18n-ignore','');dialog.setAttribute('aria-labelledby','streamTitle');
  dialog.innerHTML=`<div class="st-app">
    <header class="st-head"><div class="st-brand"><b>VOZ<span>//</span></b><p>STUDIO / 15<br><span data-st="title"></span></p></div><div class="st-head-actions"><span class="st-chip" data-st="scope"></span><button class="st-plain" id="streamBack" type="button" data-st-title="close">${V.icon.arrow}<span data-st="back"></span></button></div></header>
    <section class="st-intro"><div><p class="st-overline" data-st="kicker"></p><h2 id="streamTitle" data-st="headline"></h2></div><p data-st="intro"></p></section>
    <div class="st-grid"><div>
      <section class="st-card"><div class="st-card-top"><h3 data-st="feed"></h3><span id="streamBadge" class="st-badge"></span></div>
        <div class="st-video-wrap"><video id="streamPreview" autoplay muted playsinline></video><div class="st-empty" id="streamEmpty">${V.icon.camera}<strong id="streamEmptyTitle" data-st="waitingCamera"></strong><p id="streamEmptyHint" data-st="waitingHint"></p></div><div class="st-corners" aria-hidden="true"></div><span class="st-quality" id="streamQualityBadge">CAM / —</span><span class="st-overlay-label" data-st="previewMuted"></span></div>
        <div class="st-meter-strip"><span id="streamAudioStatus"></span><span class="st-meter" role="meter" id="streamMeter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-st-label="audioMeter"><i id="streamMeterFill"></i></span></div>
        <div class="st-stats"><div class="st-stat"><small data-st="receivers"></small><output id="streamViewers">00</output></div><div class="st-stat"><small data-st="duration"></small><output id="streamTimer">00:00</output></div><div class="st-stat"><small data-st="resolution"></small><output id="streamResolution">—</output></div><div class="st-stat"><small data-st="bitrate"></small><output id="streamBitrate">—</output></div></div>
        <div class="st-actions"><button type="button" class="st-button st-primary" id="streamPrepare" data-st="prepare"></button><button type="button" class="st-button st-primary" id="streamStart" data-st="start" hidden></button><button type="button" class="st-button st-danger" id="streamStop" data-st="stop" hidden></button><button type="button" class="st-button st-small" id="streamAudioMute" hidden></button><button type="button" class="st-button st-small" id="streamVideoMute" hidden></button></div>
      </section>
      <div id="streamMessage" class="st-message" role="status" aria-live="polite"></div>
      <p class="st-warning" data-st="monitorWarning"></p><p class="st-help" data-st="keepRunning"></p>
    </div><aside class="st-stack">
      <section class="st-card"><div class="st-card-top"><h3 data-st="accessTitle"></h3></div><div class="st-card-body">
      <div class="st-field"><label for="streamPassword" data-st="password"></label><input id="streamPassword" class="st-password" type="password" autocomplete="off" minlength="16" maxlength="256" spellcheck="false"><p data-st="passwordHint"></p></div>
      <p id="streamOnlineStatus" class="st-help" role="status"></p></div></section>
      <section class="st-card"><div class="st-card-top"><h3 data-st="devices"></h3></div><div class="st-card-body">
        <div class="st-field"><label for="streamCamera" data-st="camera"></label><select id="streamCamera"><option value="" data-st="cameraDefault"></option></select></div>
        <div class="st-field"><label for="streamQuality" data-st="quality"></label><select id="streamQuality"><option value="720" selected>HD · 720p / 30 fps</option><option value="1080">Full HD · 1080p / 30 fps</option><option value="480">SD · 480p / 24 fps</option></select><p data-st="qualityHint"></p></div>
        <div class="st-field"><label for="streamAudioSource" data-st="audio"></label><select id="streamAudioSource"><option value="studio" data-st="studioAudio"></option><option value="none" data-st="noAudio"></option></select><p data-st="audioHint"></p></div>
        <button class="st-plain" type="button" id="streamAudioSettings">${V.icon.arrow}<span data-st="settings"></span></button><br><button class="st-plain" type="button" id="streamRefresh" data-st="refresh"></button>
      </div></section>
      <section class="st-card"><div class="st-card-top"><h3 data-st="linkTitle"></h3></div><div class="st-card-body"><label for="streamLink" class="st-link-label" data-st="linkLabel"></label><input class="st-link" id="streamLink" type="text" readonly spellcheck="false"><div class="st-share-actions"><a class="st-button st-primary" id="streamOpenPlayer" target="_blank" rel="noopener noreferrer">${V.icon.external}<span data-st="openPlayer"></span></a><button class="st-button" type="button" id="streamCopy" data-st="copy"></button></div><p id="streamCopyFeedback" class="st-help" role="status"></p><p class="st-scope-note" data-st="scopeNote"></p><p class="st-help" data-st="limited"></p></div></section>
    </aside></div>
    <footer class="st-endnote"><span data-st="privacy"></span><span data-st="localTag"></span></footer>
  </div>`;
  document.body.append(dialog);
  const preview=$s('streamPreview');preview.muted=true;preview.defaultMuted=true;preview.volume=0;
  const state={phase:'idle',generation:0,camera:null,branch:null,audioSource:'studio',muted:false,videoPaused:false,room:null,credentials:null,connecting:false,onlineStatus:null,channel:null,peers:new Map(),localViewers:new Map(),localStream:null,localKey:'',startedAt:0,statsAt:0,bytes:0,statsBusy:false,bitrate:0,message:'',error:false,preparedBy:null,preparingSession:null,disposed:false,events:[],copied:false};
  const supported=V.supports(),N=window.VozOnline;
  let viewerURL=null;
  function note(type,info={}){state.events.push({type,at:Math.round(performance.now()),...info});if(state.events.length>100)state.events.shift();}
  function message(key,error=false){state.message=key;state.error=error;render();}
  function post(type,data={},to=null){if(!state.disposed)state.channel?.postMessage({v:15,from:'producer',to,type,...data});}
  function snapshot(to=null){post('status',{phase:state.phase,muted:state.muted,audioAvailable:!!state.branch&&state.branch.session.context.state==='running',videoPaused:state.videoPaused,startedAt:state.startedAt},to);}
  function dropPeer(id,notify=false){state.localViewers.delete(id);const p=state.peers.get(id);if(!p)return;state.peers.delete(id);if(notify)post('retry',{},id);p.pc.onconnectionstatechange=null;p.pc.onicecandidate=null;p.pc.close();note('peer-closed',{id});}
  function closePeers(reason){post('stop',{reason});state.localViewers.clear();state.localStream=null;state.localKey='';for(const id of [...state.peers.keys()])dropPeer(id);state.bitrate=0;state.bytes=0;state.statsAt=0;}
  function releaseBranch(){
    const b=state.branch;if(!b)return;state.branch=null;
    try{b.session.analyser.disconnect(b.gain);}catch{}
    try{b.gain.disconnect();b.dest.disconnect();}catch{}
    b.dest.stream.getTracks().forEach(track=>track.stop());
  }
  function replaceAudio(track){
    for(const p of state.peers.values())p.audio.replaceTrack(track||null).catch(()=>dropPeer(p.id,true));
  }
  function syncAudio(){
    if(!['preview','live'].includes(state.phase)||state.audioSource!=='studio')return;
    const active=typeof session!=='undefined'&&session?.phase==='live'&&session.analyser&&session.context.state!=='closed'?session:null;
    if(active!==(state.branch?.session||null)){
      const old=state.branch;state.branch=null;
      if(active){
        const gain=active.context.createGain(),dest=active.context.createMediaStreamDestination();
        dest.channelCount=1;dest.channelCountMode='explicit';gain.gain.value=0;
        active.analyser.connect(gain).connect(dest);state.branch={session:active,gain,dest};
        note('audio-attached');
      }
      const track=state.branch?.dest.stream.getAudioTracks()[0]||null;replaceAudio(track);
      if(old){try{old.session.analyser.disconnect(old.gain);old.gain.disconnect();old.dest.disconnect();}catch{}old.dest.stream.getTracks().forEach(x=>x.stop());}
    }
    if(state.branch){
      const {gain,session:s}=state.branch;const target=state.muted||s.calibration||s.context.state!=='running'||s.stream?.getAudioTracks()[0]?.muted?0:1;
      if(state.branch.target!==target){gain.gain.setTargetAtTime(target,s.context.currentTime,.015);state.branch.target=target;}
    }
  }
  async function listCameras(){
    if(!navigator.mediaDevices?.enumerateDevices)return;
    try{const devices=await navigator.mediaDevices.enumerateDevices();const select=$s('streamCamera'),previous=select.value;let n=0;
      const options=[new Option(t('cameraDefault'),'')];
      for(const d of devices.filter(x=>x.kind==='videoinput'))if(d.deviceId)options.push(new Option(d.label||`${t('cameraNumber')} ${++n}`,d.deviceId));
      select.replaceChildren(...options);if(options.some(x=>x.value===previous))select.value=previous;
    }catch{ /* No permission prompt or fallback capture is attempted here. */ }
  }
  function cancelled(token){return token!==state.generation||state.disposed;}
  function stopStream(reason='stopped'){
    const creds=state.credentials;state.credentials=null;state.connecting=false;
    if(creds)void N.end(creds.room,creds.publisherToken);
    state.channel?.close();state.channel=null;state.room=null;viewerURL=null;state.onlineStatus=null;
    state.generation++;state.phase='idle';state.startedAt=0;
    closePeers(reason);state.camera?.getTracks().forEach(track=>track.stop());state.camera=null;
    releaseBranch();preview.srcObject=null;state.muted=false;state.videoPaused=false;
    // Only a not-yet-prepared, explicitly created studio session is cancelled.
    // An established studio session is never stopped by the streaming controls.
    if(state.preparingSession&&session===state.preparingSession)stop();
    state.preparingSession=null;message(reason,reason==='cameraEnded');snapshot();note('stopped',{reason});
  }
  async function prepare(){
    if(state.phase==='starting'){stopStream();return;}
    if(!supported){message('unsupported',true);return;}
    if(state.phase!=='idle')return;
    const token=++state.generation;state.phase='starting';state.audioSource=$s('streamAudioSource').value;
    message('permissionBusy');snapshot();
    let cameraPromise,audioPromise=Promise.resolve();let created=null;
    try{
      if(state.audioSource==='studio'){
        if(session?.phase==='starting')throw Object.assign(new Error(),{name:'StudioAudioError'});
        if(!session){audioPromise=start();created=session;state.preparingSession=created;}
        else if(session.context.state==='suspended'){audioPromise=session.context.resume();}
      }
      audioPromise.catch(()=>{});
      const q=Number($s('streamQuality').value),cameraId=$s('streamCamera').value;
      cameraPromise=navigator.mediaDevices.getUserMedia({audio:false,video:{...(cameraId?{deviceId:{exact:cameraId}}:{}),width:{ideal:q===1080?1920:q===720?1280:854},height:{ideal:q},frameRate:{ideal:q===480?24:30,max:30}}});
      // A late permission response must immediately stop its camera after cancellation.
      cameraPromise.then(stream=>{if(cancelled(token))stream.getTracks().forEach(x=>x.stop());}).catch(()=>{});
      const camera=await cameraPromise;
      if(cancelled(token)){camera.getTracks().forEach(x=>x.stop());return;}
      state.camera=camera;await audioPromise;
      if(cancelled(token))return;
      if(state.audioSource==='studio'&&session?.phase!=='live')throw Object.assign(new Error(),{name:'StudioAudioError'});
      state.preparingSession=null;state.phase='preview';state.muted=false;state.videoPaused=false;
      preview.srcObject=camera;preview.muted=true;preview.volume=0;
      await preview.play().catch(()=>{});
      camera.getVideoTracks()[0].addEventListener('ended',()=>{if(state.camera===camera)stopStream('cameraEnded');});
      syncAudio();void listCameras();message('prepared');snapshot();note('prepared');
    }catch(e){
      if(cancelled(token))return;
      stopStream();
      if(created&&session===created)stop();
      const errors={NotAllowedError:'notAllowed',NotFoundError:'notFound',NotReadableError:'notReadable',OverconstrainedError:'constraints',StudioAudioError:'microphoneError'};
      message(errors[e.name]||'genericError',true);note('prepare-error',{name:e.name});
    }
    // start() installs its own rejection handler; still consume potential resume rejection.
    finally{audioPromise?.catch(()=>{});}
  }
  async function offerTo(id){
    if(state.phase!=='live'||state.peers.has(id)||!state.channel?.ready)return;
    if(state.peers.size+state.localViewers.size>=4){post('limit',{},id);return;}
    const pc=new RTCPeerConnection(state.channel.rtcConfig),pid=V.id();
    const stream=new MediaStream([state.camera.getVideoTracks()[0],...(state.branch?.dest.stream.getAudioTracks()||[])]);
    const video=pc.addTransceiver(stream.getVideoTracks()[0],{direction:'sendonly',streams:[stream]}).sender;
    const audio=pc.addTransceiver(stream.getAudioTracks()[0]||'audio',{direction:'sendonly',streams:[stream]}).sender;
    const p={id,pc,pid,video,audio,queue:[],candidateCount:0,lastSeen:performance.now(),createdAt:performance.now(),seenConnected:false};state.peers.set(id,p);
    pc.onicecandidate=e=>{if(e.candidate){p.candidateCount++;post('ice',{pid,candidate:e.candidate.toJSON()},id);}};
    pc.onconnectionstatechange=()=>{
      if(pc.connectionState==='connected'){p.seenConnected=true;note('peer-connected',{id});}
      if(['failed','closed'].includes(pc.connectionState))dropPeer(id,true);render();
    };
    try{
      const params=video.getParameters();if(params.encodings?.length){params.encodings[0].maxBitrate=Number($s('streamQuality').value)>=1080?4000000:2200000;params.encodings[0].maxFramerate=30;await video.setParameters(params);}
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      if(state.peers.get(id)!==p)return;
      post('offer',{pid,description:pc.localDescription.toJSON()},id);note('offer',{id});
    }catch(e){note('offer-error',{name:e.name});dropPeer(id,true);}
  }
  async function handle(e){
    const m=e.data;if(!m||m.v!==15||!V.validId(m.from)||m.to&&m.to!=='producer')return;
    if(m.type==='hello'){
      const p=state.peers.get(m.from);if(p)p.lastSeen=performance.now();
      const local=state.localViewers.get(m.from);if(local)local.lastSeen=performance.now();
      snapshot(m.from);if(state.phase==='live'&&!m.local&&!local)void offerTo(m.from);return;
    }
    if(m.type==='bye'){dropPeer(m.from);return;}
    const p=state.peers.get(m.from);if(!p||m.pid!==p.pid)return;
    try{
      if(m.type==='answer'&&m.description?.type==='answer'&&typeof m.description.sdp==='string'&&m.description.sdp.length<100000){
        if(p.pc.signalingState!=='have-local-offer')return;
        await p.pc.setRemoteDescription(m.description);note('answer-received',{id:m.from});
        for(const c of p.queue.splice(0))await p.pc.addIceCandidate(c);
      }else if(m.type==='ice'&&m.candidate&&typeof m.candidate.candidate==='string'&&m.candidate.candidate.length<3000){
        if(p.pc.remoteDescription)await p.pc.addIceCandidate(m.candidate);else if(p.queue.length<128)p.queue.push(m.candidate);
      }else if(m.type==='retry'){dropPeer(m.from);void offerTo(m.from);}
    }catch(e){note('signal-error',{name:e.name});dropPeer(m.from,true);}
  }
  
  async function stats(){
    if(state.statsBusy)return;state.statsBusy=true;
    try{
      let bytes=0;
      for(const [id,entry] of state.localViewers)if(performance.now()-entry.lastSeen>15000)state.localViewers.delete(id);
      for(const p of [...state.peers.values()]){
        if(performance.now()-p.lastSeen>65000||(!p.seenConnected&&performance.now()-p.createdAt>30000)){dropPeer(p.id,true);continue;}
        if(p.pc.connectionState!=='connected')continue;
        const report=await p.pc.getStats();report.forEach(r=>{if(r.type==='outbound-rtp'&&(r.kind==='video'||r.mediaType==='video'))bytes+=r.bytesSent||0;});
      }
      const now=performance.now();state.bitrate=state.statsAt&&bytes>=state.bytes?(bytes-state.bytes)*8/(now-state.statsAt):0;state.bytes=bytes;state.statsAt=now;
    }catch{}finally{state.statsBusy=false;}
  }
  function render(){
    const prepared=['preview','live'].includes(state.phase),busy=state.phase==='starting',live=state.phase==='live';
    trigger.dataset.capturing=String(prepared);trigger.dataset.live=String(live);
    $s('streamBadge').textContent=t(live?'live':prepared?'preview':busy?'starting':'offline');$s('streamBadge').dataset.live=String(live);
    $s('streamPrepare').hidden=prepared;$s('streamPrepare').disabled=!supported;$s('streamPrepare').textContent=t(busy?'cancel':'prepare');$s('streamPrepare').removeAttribute('data-st');
    $s('streamStart').hidden=!prepared||live;$s('streamStart').disabled=state.connecting;$s('streamPassword').disabled=state.connecting||live;$s('streamStop').hidden=!prepared;
    for(const id of ['streamCamera','streamQuality','streamAudioSource','streamRefresh'])$s(id).disabled=prepared||busy;
    $s('streamAudioMute').hidden=!prepared||state.audioSource==='none';$s('streamVideoMute').hidden=!prepared;
    $s('streamAudioMute').textContent=t(state.muted?'micOff':'micOn');$s('streamAudioMute').setAttribute('aria-pressed',String(state.muted));
    $s('streamVideoMute').textContent=t(state.videoPaused?'camOff':'camOn');$s('streamVideoMute').setAttribute('aria-pressed',String(state.videoPaused));
    $s('streamEmpty').hidden=prepared&&!state.videoPaused;
    $s('streamEmptyTitle').removeAttribute('data-st');$s('streamEmptyHint').removeAttribute('data-st');
    $s('streamEmptyTitle').textContent=t(state.videoPaused?'videoPaused':'waitingCamera');$s('streamEmptyHint').textContent=t(busy?'permissionBusy':'waitingHint');
    const settings=state.camera?.getVideoTracks()[0]?.getSettings()||{};
    $s('streamQualityBadge').textContent=settings.height?`${settings.height}p / ${Math.round(settings.frameRate||0)} fps`:'CAM / —';
    $s('streamResolution').textContent=settings.width?`${settings.width}×${settings.height}`:'—';
    $s('streamTimer').textContent=V.time(live?(Date.now()-state.startedAt)/1000:0);
    $s('streamViewers').textContent=String([...state.peers.values()].filter(p=>p.pc.connectionState==='connected').length+state.localViewers.size).padStart(2,'0');
    $s('streamBitrate').textContent=live?(state.peers.size?`${Math.round(state.bitrate)} kbps`:state.localViewers.size?'LOCAL':'—'):'—';
    const audioKey=state.audioSource==='none'?'noAudio':state.muted?'audioMuted':state.branch?.session.calibration?'microphoneCalibrating':!state.branch||state.branch.session.context.state!=='running'?'microphoneWaiting':'audioReady';
    $s('streamAudioStatus').textContent=t(audioKey);
    let level=0;if(state.branch&&!state.muted&&state.branch.target){const a=state.branch.session.analyser;const data=state.branch.samples||(state.branch.samples=new Float32Array(a.fftSize));a.getFloatTimeDomainData(data);let energy=0;for(const x of data)energy+=x*x;level=Math.min(1,Math.sqrt(energy/data.length)*5);}
    $s('streamMeterFill').style.transform=`scaleX(${level})`;$s('streamMeter').setAttribute('aria-valuenow',String(Math.round(level*100)));
    $s('streamOnlineStatus').textContent=t(state.onlineStatus||(N.configured()?'onlineReady':'serverMissing'));
    $s('streamLink').value=viewerURL?.href||'';$s('streamLink').placeholder=t('startFirst');
    $s('streamCopy').disabled=!viewerURL;$s('streamOpenPlayer').setAttribute('aria-disabled',String(!viewerURL));
    if(viewerURL)$s('streamOpenPlayer').href=viewerURL.href;else $s('streamOpenPlayer').removeAttribute('href');
    $s('streamMessage').textContent=state.message?t(state.message):'';$s('streamMessage').dataset.error=String(state.error);
  }
  function show(){
    for(const id of ['settingsDrawer','premiumDialog'])if($s(id)?.open)$s(id).close();
    if(!dialog.open)dialog.showModal();trigger.setAttribute('aria-expanded','true');
    V.translate(dialog);render();void listCameras();
    if(!supported)message('unsupported',true);
  }
  trigger.addEventListener('click',show);
  $s('streamBack').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');if(!document.querySelector('dialog[open]'))trigger.focus({preventScroll:true});});
  document.addEventListener('keydown',e=>{
    if(e.altKey&&!e.ctrlKey&&!e.metaKey){
      if(e.key.toLowerCase()==='t'){e.preventDefault();dialog.open?dialog.close():show();}
      else if([',','p'].includes(e.key.toLowerCase())&&dialog.open)dialog.close();
    }
  },true);
  $s('streamAudioSettings').addEventListener('click',()=>{dialog.close();$s('settingsTrigger').click();$s('tab-input').click();});
  $s('streamPrepare').addEventListener('click',()=>void prepare());
  function onlineError(e){return ({NOT_CONFIGURED:'serverMissing',AUTH_REQUIRED:'authError',NETWORK:'networkError',HTTPS_REQUIRED:'unsupported',TURN_NOT_CONFIGURED:'turnError',TURN_UNAVAILABLE:'turnError',SERVER_NOT_CONFIGURED:'serverError',ROOM_ENDED:'endedLink',RATE_LIMIT:'rateLimit',SESSION_LIMIT:'sessionLimit',PUBLISHER_EXISTS:'roomConflict'})[e.code]||'serverError';}
  $s('streamStart').addEventListener('click',async()=>{
    if(state.phase!=='preview'||!state.camera?.active||state.connecting)return;
    const password=$s('streamPassword').value;
    if(!N.configured()){message('serverMissing',true);return;}
    if(password.length<16){message('authError',true);$s('streamPassword').focus();return;}
    const generation=state.generation;state.connecting=true;state.onlineStatus='onlineConnecting';message('onlineConnecting');
    let creds,channel;
    try{
      creds=await N.create(password);$s('streamPassword').value='';
      if(cancelled(generation)){void N.end(creds.room,creds.publisherToken);return;}
      state.credentials=creds;state.room=creds.room;
      channel=new N.Signal({room:creds.room,token:creds.publisherToken,role:'publisher',clientId:V.id(),onState:(phase,code)=>{
        if(state.channel!==channel)return;
        if(phase==='connected'){
          // Re-negotiate after reconnect; never reuse stale SDP/ICE exchanges.
          for(const id of [...state.peers.keys()])dropPeer(id);
          state.onlineStatus=channel.relayAvailable?'onlineConnected':'directWarning';snapshot();
        }else if(phase==='ended'){stopStream();message(onlineError({code}),true);}
        else state.onlineStatus=phase==='connecting'?'onlineConnecting':'onlineReconnecting';render();
      }});
      state.channel=channel;channel.onmessage=handle;await channel.open();
      if(cancelled(generation)){channel.close();void N.end(creds.room,creds.publisherToken);return;}
      viewerURL=new URL('watch.html',document.baseURI);viewerURL.hash=new URLSearchParams({room:creds.room,key:creds.viewerToken}).toString();
      state.phase='live';state.startedAt=Date.now();syncAudio();message('broadcasting');snapshot();note('live');
    }catch(e){
      channel?.close();if(creds)void N.end(creds.room,creds.publisherToken);
      if(!cancelled(generation)){state.channel=null;state.credentials=null;state.room=null;state.onlineStatus=null;message(onlineError(e),true);}
    }finally{if(!cancelled(generation)){state.connecting=false;render();}}
  });
  $s('streamStop').addEventListener('click',()=>stopStream());
  $s('streamAudioMute').addEventListener('click',()=>{state.muted=!state.muted;syncAudio();render();snapshot();});
  $s('streamVideoMute').addEventListener('click',()=>{state.videoPaused=!state.videoPaused;state.camera?.getVideoTracks().forEach(track=>{track.enabled=!state.videoPaused;});render();snapshot();});
  $s('streamRefresh').addEventListener('click',()=>void listCameras());
  $s('streamAudioSource').addEventListener('change',()=>{state.audioSource=$s('streamAudioSource').value;render();});
  $s('streamCopy').addEventListener('click',async()=>{
    if(!viewerURL)return;try{await navigator.clipboard.writeText(viewerURL.href);$s('streamCopyFeedback').textContent=t('copied');}
    catch{$s('streamLink').select();$s('streamCopyFeedback').textContent=t('copyFailed');}
  });
  const tick=setInterval(()=>{if(!state.disposed){syncAudio();if(dialog.open||state.phase==='live')render();}},150);
  const heartbeat=setInterval(()=>{snapshot();void stats();},1500);
  window.addEventListener('voz:streamlanguage',()=>{V.translate(dialog);V.translate(trigger.parentElement);render();void listCameras();});
  navigator.mediaDevices?.addEventListener?.('devicechange',()=>void listCameras());
  window.addEventListener('pagehide',()=>{stopStream();state.disposed=true;clearInterval(tick);clearInterval(heartbeat);state.channel?.close();});

  window.streamDiagnostics=()=>({version:15,phase:state.phase,room:state.room,prepared:!!state.camera,cameraLive:state.camera?.getVideoTracks().some(x=>x.readyState==='live')||false,
    previewMuted:preview.muted,previewVolume:preview.volume,audioBranch:!!state.branch,audioUsesStudio:state.branch?.session===session,
    microphoneCaptures:session?.stream?.getAudioTracks().length||0,muted:state.muted,videoPaused:state.videoPaused,
    localViewers:state.localViewers.size,peers:[...state.peers.values()].map(p=>({id:p.id,connection:p.pc.connectionState,ice:p.pc.iceConnectionState,signaling:p.pc.signalingState,gathering:p.pc.iceGatheringState,localCandidates:p.candidateCount})),bitrate:state.bitrate,
    events:state.events.map(e=>({...e}))});
  $s('streamOpenPlayer').addEventListener('click',e=>{if(!viewerURL)e.preventDefault();});
  V.translate();render();
})();
