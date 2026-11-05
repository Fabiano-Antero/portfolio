'use strict';
/** Shared by the studio and the read-only receiver. WebRTC with authenticated online signaling. */
window.VozStream = (() => {
  const LANGUAGE_KEY='voz.interface.language.v13';
  const D={
    sessionLimit:["Limite de acessos desta sessão atingido. Encerre e crie outra transmissão.", "Session admission limit reached. End and create a new broadcast."],
    viewerDenied:["Convite inválido ou sem autorização. Solicite um novo link.", "Invalid or unauthorized invitation. Request a new link."],
    roomConflict:["Esta sala já tem um transmissor conectado.", "This room already has a broadcaster."],
    startFirst:["Inicie a transmissão para gerar o link do espectador.", "Go live to generate the viewer link."],
    rateLimit:["Muitas tentativas. Aguarde antes de tentar novamente.", "Too many attempts. Wait before retrying."],
    endedLink:["Sessão encerrada ou convite expirado. Solicite um novo link ao transmissor.", "Session ended or invitation expired. Request a new link from the broadcaster."],
    serverError:["Falha no backend. Verifique a configuração e os logs da Cloudflare.", "Backend error. Check configuration and Cloudflare logs."],
    turnError:["Configure TURN_KEY_ID e TURN_API_TOKEN no Worker para transmitir entre redes.", "Configure TURN_KEY_ID and TURN_API_TOKEN in the Worker to broadcast across networks."],
    networkError:["Servidor indisponível. Verifique apiBase, a internet e as origens permitidas no backend.", "Server unavailable. Check apiBase, your internet connection and allowed backend origins."],
    authError:["Senha inválida ou ausente. Use a senha do transmissor configurada no backend.", "Invalid or missing password. Use the broadcaster password configured in the backend."],
    directWarning:["Conexão direta, sem TURN. Pode falhar em outras redes.", "Direct connection without TURN. It may fail on other networks."],
    onlineReconnecting:["Reconectando à sala…", "Reconnecting to the room…"],
    onlineConnected:["Conectado · sinalização online", "Connected · online signaling"],
    onlineConnecting:["Abrindo sala protegida…", "Opening protected room…"],
    onlineReady:["Backend configurado. A conexão será verificada ao iniciar.", "Backend configured. The connection will be checked when you go live."],
    serverMissing:["Backend não configurado. Defina apiBase no arquivo config.js. A prévia e o estúdio continuam disponíveis.", "Backend not configured. Set apiBase in config.js. Preview and studio remain available."],
    passwordHint:["Senha configurada no backend da Cloudflare. Não é enviada aos espectadores nem salva no navegador.", "Password configured in the Cloudflare backend. Never sent to viewers or saved in this browser."],
    password:["Senha para transmitir", "Broadcast password"],
    accessTitle:["04 / ACESSO DO TRANSMISSOR", "04 / BROADCASTER ACCESS"],
    title:['Transmissão','Broadcast'],live:['AO VIVO','LIVE'],offline:['FORA DO AR','OFF AIR'],preview:['PRÉVIA LOCAL','LOCAL PREVIEW'],starting:['AUTORIZANDO','REQUESTING ACCESS'],
    open:['Abrir transmissão (Alt + T)','Open broadcast (Alt + T)'],back:['Voltar ao estúdio','Back to studio'],close:['Fechar painel, mantendo a captura','Close panel, keep capture running'],
    kicker:['CÂMERA + ÁUDIO / TEMPO REAL','CAMERA + AUDIO / REAL TIME'],headline:['Seu sinal. Ao vivo.','Your signal. Live.'],intro:['Prepare a câmera e envie o áudio do estúdio para um player em outra página.','Prepare the camera and send studio audio to a player on another page.'],
    scope:["ONLINE / LINK PRIVADO", "ONLINE / PRIVATE LINK"],scopeNote:["Quem tiver o link pode assistir durante esta sessão. Encerre a transmissão para invalidar o convite. O transmissor deve permanecer aberto.", "Anyone with the link can watch during this session. End the broadcast to invalidate the invitation. Keep the studio open."],
    feed:['01 / MONITOR DE TRANSMISSÃO','01 / BROADCAST MONITOR'],previewMuted:['PRÉVIA SEM SOM','MUTED PREVIEW'],waitingCamera:['Sua câmera aparece aqui','Your camera appears here'],waitingHint:['A captura só começa quando você autoriza.','Capture only starts with your permission.'],videoPaused:['Vídeo pausado','Video paused'],
    devices:['02 / FONTES DO SINAL','02 / SIGNAL SOURCES'],camera:['Câmera','Camera'],cameraDefault:['Câmera padrão','Default camera'],cameraNumber:['Câmera','Camera'],quality:['Qualidade solicitada','Requested quality'],qualityHint:['A qualidade efetiva depende da câmera. Para trocar as fontes, encerre a captura.','Actual quality depends on the camera. End capture to change sources.'],
    audio:['Áudio transmitido','Broadcast audio'],studioAudio:['Áudio tratado do estúdio','Processed studio audio'],noAudio:['Sem áudio','No audio'],audioHint:['Usa o mesmo microfone e efeito de voz, sem duplicar a captura. O volume do retorno não altera a transmissão.','Uses the same microphone and voice effect without duplicate capture. Monitor volume does not affect the broadcast.'],
    settings:['Configurar microfone e efeito','Microphone and voice settings'],refresh:['Atualizar dispositivos','Refresh devices'],prepare:['Ativar prévia','Enable preview'],cancel:['Cancelar ativação','Cancel activation'],start:['Iniciar transmissão','Go live'],stop:['Encerrar captura e transmissão','End capture and broadcast'],
    micOn:['Silenciar envio','Mute broadcast audio'],micOff:['Ativar áudio no envio','Unmute broadcast audio'],camOn:['Pausar vídeo','Pause video'],camOff:['Retomar vídeo','Resume video'],
    linkTitle:['03 / PÁGINA DE EXIBIÇÃO','03 / VIEWER PAGE'],linkLabel:["Link para assistir", "Viewer link"],openPlayer:['Abrir player','Open player'],copy:['Copiar link','Copy link'],copied:["Link copiado. Abra no celular ou em outro computador.", "Link copied. Open on a phone or another computer."],copyFailed:['Selecione e copie o link manualmente.','Select and copy the link manually.'],
    receivers:['RECEPTORES','VIEWERS'],duration:['TEMPO NO AR','LIVE TIME'],resolution:['RESOLUÇÃO','RESOLUTION'],bitrate:['SAÍDA DO VÍDEO','VIDEO OUTPUT'],
    prepared:['Prévia pronta. Nada está sendo transmitido ainda.','Preview ready. Nothing is being broadcast yet.'],broadcasting:['Sinal disponível no player. Você pode voltar ao estúdio sem interromper a transmissão.','Signal available in the player. You can return to the studio without interrupting the broadcast.'],
    stopped:['Câmera e envio encerrados. O microfone do estúdio mantém seu controle independente.','Camera and broadcast stopped. The studio microphone keeps its independent control.'],privacy:["Sem gravação. Envio somente após iniciar a transmissão.", "No recording. Media is sent only after going live."],
    monitorWarning:['Para evitar eco, use fones e não ouça o retorno do estúdio e o player ao mesmo tempo. A prévia nunca reproduz áudio.','To avoid echo, use headphones and do not listen to studio monitoring and the player at the same time. The preview never plays audio.'],
    keepRunning:['Fechar este painel mantém a captura. Use “Encerrar” para liberar a câmera.','Closing this panel keeps capture running. Use “End capture” to release the camera.'],
    unsupported:["Use HTTPS ou localhost em um navegador compatível com câmera e WebRTC.", "Use HTTPS or localhost in a browser supporting camera and WebRTC."],
    notAllowed:['Permissão negada. Autorize a câmera no navegador e tente novamente.','Permission denied. Allow camera access in your browser and try again.'],notFound:['Nenhuma câmera encontrada. Conecte uma câmera e atualize os dispositivos.','No camera found. Connect a camera and refresh the devices.'],notReadable:['Câmera indisponível. Verifique se outro aplicativo está usando o dispositivo.','Camera unavailable. Check whether another application is using it.'],constraints:['A câmera selecionada não está disponível. Escolha a câmera padrão.','Selected camera unavailable. Choose the default camera.'],genericError:['Não foi possível preparar o sinal. Verifique as permissões e tente novamente.','Unable to prepare the signal. Check permissions and try again.'],
    microphoneError:['O microfone do estúdio não iniciou. Confira Entrada nas configurações ou escolha “Sem áudio”.','Studio microphone did not start. Check Input in settings or choose “No audio”.'],microphoneWaiting:['Áudio em espera: ative ou retome o microfone no estúdio.','Audio waiting: enable or resume the studio microphone.'],microphoneCalibrating:['Áudio temporariamente silenciado durante a calibração do estúdio.','Audio temporarily muted during studio calibration.'],audioReady:['Áudio tratado conectado','Processed audio connected'],audioMuted:['Envio de áudio silenciado','Broadcast audio muted'],
    cameraEnded:['A câmera foi desconectada ou a permissão foi encerrada. O envio foi interrompido.','Camera disconnected or permission ended. Broadcast stopped.'],
    playerTitle:['Player ao vivo','Live player'],receiverLabel:['RECEPTOR / SOMENTE EXIBIÇÃO','RECEIVER / VIEW ONLY'],waiting:['Aguardando transmissão','Waiting for broadcast'],waitingBody:['Mantenha o estúdio aberto e clique em Iniciar transmissão.','Keep the studio open and click Go live.'],connecting:['Conectando ao sinal…','Connecting to the signal…'],connected:['RECEBENDO AO VIVO','RECEIVING LIVE'],ended:['Transmissão encerrada','Broadcast ended'],sourceGone:['Origem desconectada','Source disconnected'],sourceGoneBody:["Aguarde a reconexão do estúdio. A transmissão exige que ele permaneça aberto.", "Wait for the studio to reconnect. The broadcast requires it to remain open."],
    invalid:['Link de transmissão inválido','Invalid broadcast link'],invalidBody:['Abra o player pelo botão da tela de transmissão.','Open the player using the button in the broadcast screen.'],previewWait:['Origem em prévia','Source in preview'],previewWaitBody:['A câmera está pronta. A transmissão ainda não foi iniciada.','Camera is ready. The broadcast has not started yet.'],limit:['Limite de receptores atingido','Viewer limit reached'],limitBody:['Esta versão aceita até 4 players simultâneos. Feche um player e tente novamente.','This version supports up to 4 simultaneous players. Close a player and retry.'],
    soundOn:['Silenciar som','Mute sound'],soundOff:['Ativar som','Enable sound'],volume:['Volume do player','Player volume'],fullscreen:['Tela cheia','Fullscreen'],exitFullscreen:['Sair da tela cheia','Exit fullscreen'],reconnect:['Reconectar','Reconnect'],play:['Reproduzir vídeo','Play video'],soundHint:['O player começa sem som. Ative apenas uma saída para evitar duplicação.','The player starts muted. Enable only one output to avoid duplication.'],
    receiving:['VÍDEO RECEBIDO','VIDEO RECEIVED'],frames:['QUADROS','FRAMES'],signal:['SINAL','SIGNAL'],noCapture:['Este player não acessa câmera ou microfone.','This player never accesses your camera or microphone.'],language:['Idioma','Language'],soundBlocked:['O navegador bloqueou o som. Clique novamente em Ativar som.','Your browser blocked audio. Click Enable sound again.'],fullscreenBlocked:['Não foi possível entrar em tela cheia.','Unable to enter fullscreen.'],playerPaused:['Reprodução pausada pelo navegador','Playback paused by browser'],
    localTag:["WEBRTC / TRANSMISSÃO ONLINE", "WEBRTC / ONLINE BROADCAST"],noSource:['Estúdio indisponível','Studio unavailable'],noSourceBody:["O transmissor está desconectado. Aguarde a reconexão ou solicite um novo link.", "The broadcaster is disconnected. Wait for reconnection or request a new link."],
    audioMeter:['Nível do áudio enviado','Broadcast audio level'],reconnecting:['Reconectando…','Reconnecting…'],permissionBusy:['Aguarde a autorização ou cancele a solicitação.','Allow access or cancel the request.'],limited:["Até 4 espectadores simultâneos · sessão de até 6 horas", "Up to 4 simultaneous viewers · sessions up to 6 hours"],
    connectionFailed:["Não foi possível conectar a mídia. Verifique a rede, a configuração TURN e tente Reconectar.", "Could not connect media. Check your network and TURN configuration, then reconnect."],
    direct:['FLUXO LOCAL','LOCAL STREAM'],transport:['TRANSPORTE','TRANSPORT'],
    cameraMuted:['A câmera está temporariamente sem sinal.','Camera temporarily has no signal.'],cameraPausedSmall:['CÂMERA PAUSADA','CAMERA PAUSED'],localOnlyBadge:["CONVITE PRIVADO", "PRIVATE INVITATION"]
  };
  let lang='pt-BR';
  try{lang=window.VozI18n?.language||localStorage.getItem(LANGUAGE_KEY)||'pt-BR';}catch{}
  if(lang!=='en')lang='pt-BR';
  const t=k=>(D[k]||[k,k])[lang==='en'?1:0];
  function translate(root=document){
    root.querySelectorAll('[data-st]').forEach(el=>{const v=t(el.dataset.st);if(el.textContent!==v)el.textContent=v;});
    root.querySelectorAll('[data-st-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.stLabel)));
    root.querySelectorAll('[data-st-title]').forEach(el=>el.title=t(el.dataset.stTitle));
  }
  function language(value,save=false){
    if(!['en','pt-BR'].includes(value))return;
    lang=value;
    if(save){try{localStorage.setItem(LANGUAGE_KEY,lang);}catch{};window.VozI18n?.setLanguage(lang);}
    translate();window.dispatchEvent(new CustomEvent('voz:streamlanguage',{detail:{language:lang}}));
  }
  window.addEventListener('voz:languagechange',e=>language(e.detail.language));
  window.addEventListener('storage',e=>{if(e.key===LANGUAGE_KEY){language(e.newValue);if(window.VozI18n&&window.VozI18n.language!==lang)window.VozI18n.setLanguage(lang);}});
  function id(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');}
  const validId=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
  const time=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  function supports(){return !!(window.isSecureContext&&window.WebSocket&&window.RTCPeerConnection&&navigator.mediaDevices?.getUserMedia);}
  const icon={
    broadcast:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2m7.2-7.2a5.1 5.1 0 0 1 0 7.2M5.3 5.3a9.5 9.5 0 0 0 0 13.4m13.4-13.4a9.5 9.5 0 0 1 0 13.4"/></svg>',
    camera:'<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="1"/><path d="m15 10 6-3v10l-6-3"/></svg>',
    arrow:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    external:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/></svg>'
  };
  return Object.freeze({t,translate,language,get lang(){return lang;},id,validId,time,supports,icon});
})();
