'use strict';
/**
 * Local Web Audio output routing. Uses AudioContext.setSinkId when available.
 * Bluetooth pairing is performed by the operating system, never by this page.
 * Output is muted on a switch, permission error or detected device loss.
 * No audio is recorded or sent. The selected output and monitor preference stay in local browser storage.
 */
window.AudioOutput=(() => {
  const el=id=>document.getElementById(id);
  const AC=window.AudioContext||window.webkitAudioContext;
  const nativeRouting=!!(window.isSecureContext&&AC&&typeof AC.prototype.setSinkId==='function');
  const S={id:'',label:'Padrão do sistema',devices:[],busy:false,authorizing:false,
    unavailable:false,test:null,sequence:0,enumeration:0,errors:[],initialized:false,permissionTrackStops:0};
  // Remember the explicit sink too, so reloading with return ON cannot silently
  // replace a selected headset with the system speakers.
  const OUTPUT_KEY='voz.monitor.output.v12';
  try {
    const saved=JSON.parse(localStorage.getItem(OUTPUT_KEY)||'null');
    if(saved&&typeof saved.id==='string'&&saved.id.length<2048){
      S.id=saved.id;S.label=typeof saved.label==='string'?saved.label.slice(0,300):'Saída selecionada';
      S.unavailable=!!S.id; // verify permission/device enumeration before opening it
    }
  } catch { /* Origin storage may be unavailable. */ }
  const current=()=>typeof session==='undefined'?null:session;
  function message(text,kind='info') {
    el('outputStatus').textContent=text;el('outputStatus').dataset.kind=kind;
  }
  function canMonitor(item) {
    return !!item&&!S.busy&&!S.authorizing&&!S.test&&!S.unavailable&&item.outputReady===true;
  }
  function syncControls(item=current()) {
    if(!S.initialized)return;
    const starting=item?.phase==='starting';
    const locked=S.busy||S.authorizing||!!S.test||starting;
    el('outputDevice').disabled=!nativeRouting||locked;
    el('authorizeOutput').disabled=!nativeRouting||locked;
    el('refreshOutputs').disabled=locked||!navigator.mediaDevices?.enumerateDevices;
    el('testOutput').disabled=!AC||!window.isSecureContext||S.busy||S.authorizing||starting||S.unavailable;
    el('testOutput').textContent=S.test?'Parar teste':'Testar saída';
    el('applyOutput').disabled=!nativeRouting||locked;
    el('outputSelected').textContent=`${S.label}${S.unavailable?' · indisponível':''}`;
  }
  function refreshMain() {
    if(typeof setControls==='function')setControls(current()?.phase||'idle');
    if(typeof updateMonitor==='function')updateMonitor();
    syncControls();
  }
  function mute(item=current()) {
    if(item?.monitorGain&&item.context.state!=='closed'){
      const gain=item.monitorGain.gain,now=item.context.currentTime;
      gain.cancelScheduledValues(now);gain.setValueAtTime(0,now);
    }
    // Caller marks the temporary block before refreshing UI.
  }
  function explain(error) {
    const messages={
      NotAllowedError:'O navegador não autorizou essa saída. Use Autorizar dispositivos. Se houver bloqueio do site, permita o microfone e a seleção de alto-falante, quando disponível.',
      NotFoundError:'Essa saída não está disponível. Conecte o aparelho ao Windows, clique em Atualizar lista e selecione-o novamente.',
      AbortError:'A troca de saída falhou. Confira a conexão Bluetooth e tente novamente.',
      InvalidStateError:'A saída não pôde ser usada agora. Clique novamente no botão ou reinicie a captura.',
      SecurityError:'Abra por localhost ou HTTPS. Uma prévia ou página incorporada pode bloquear a escolha da saída.',
      NotSupportedError:'Este navegador não permite selecionar a saída por aqui. Escolha o aparelho nas configurações de som do Windows.'
    };
    return messages[error?.name]||'Não foi possível usar a saída. Confira a conexão e a permissão do navegador e tente novamente.';
  }
  function recordError(error) {
    S.errors.push(error?.name||'OutputError');if(S.errors.length>20)S.errors.shift();
  }
  async function enumerate({notify=false}={}) {
    if(!navigator.mediaDevices?.enumerateDevices)return;
    const token=++S.enumeration;
    try {
      const devices=await navigator.mediaDevices.enumerateDevices();
      if(token!==S.enumeration)return;
      S.devices=devices.filter(d=>d.kind==='audiooutput');
      const options=[new Option('Padrão do sistema · segue o Windows','')],ids=new Set(['']);
      let unnamed=0;
      for(const d of S.devices){
        if(!d.deviceId||d.deviceId==='default'||ids.has(d.deviceId))continue;
        ids.add(d.deviceId);options.push(new Option(d.label||`Saída de áudio ${++unnamed}`,d.deviceId));
      }
      const wasUnavailable=S.unavailable;
      S.unavailable=!!S.id&&!ids.has(S.id);
      if(S.unavailable){
        const missing=new Option(`${S.label} · indisponível`,S.id);missing.disabled=true;options.push(missing);
        const item=current();if(item)item.outputReady=false;mute(item);
        if(S.test)cancelTest();
        message('A saída selecionada não está disponível. A escolha do retorno foi mantida, mas o som está em espera. Reconecte o aparelho ou escolha outra saída.','warn');
      }else if(S.id){
        const found=S.devices.find(d=>d.deviceId===S.id);if(found?.label)S.label=found.label;
      }
      el('outputDevice').replaceChildren(...options);el('outputDevice').value=S.id;
      if(notify&&!S.unavailable){
        message(options.length>1?'Lista atualizada. Escolha a saída desejada; o microfone é configurado separadamente na aba Entrada.':'Só a saída padrão está visível. Conecte o Bluetooth no sistema e use Autorizar dispositivos.');
      }
      refreshMain();
      if(wasUnavailable&&!S.unavailable&&S.id&&current()&&!S.busy&&!S.test)await apply(current());
    }catch(error){recordError(error);if(notify)message(explain(error),'warn');syncControls();}
  }
  async function route(context,id) {
    if(typeof context.setSinkId==='function'){await context.setSinkId(id);return;}
    if(id)throw new DOMException('Output routing unsupported','NotSupportedError');
    // Default destination still works in browsers without per-device routing.
  }
  async function apply(item=current()) {
    if(S.busy||S.authorizing||S.test)return;
    if(!item?.context){
      message(S.unavailable?'Saída indisponível. Atualize a lista e escolha outra.':`Preparado: ${S.label}. Use Testar saída ou ative o microfone.`,S.unavailable?'warn':'info');return;
    }
    const token=++S.sequence,id=S.id;
    S.busy=true;item.outputReady=false;mute(item);refreshMain();
    message(`Aplicando saída: ${S.label}…`);
    try{
      await route(item.context,id);
      if(token!==S.sequence||item!==current())return;
      item.outputReady=true;item.outputId=id;S.unavailable=false;
      message(`Saída aplicada: ${S.label}. A preferência do retorno foi mantida.`);
    }catch(error){
      if(token!==S.sequence||item!==current())return;
      item.outputReady=false;recordError(error);message(explain(error)+' O som ficará em espera; a preferência do retorno foi mantida.','warn');
    }finally{
      if(token===S.sequence){S.busy=false;refreshMain();}
    }
  }
  async function select(id,label) {
    if(S.busy||S.test)return;
    S.id=id||'';S.label=S.id?(label||'Saída selecionada'):'Padrão do sistema';S.unavailable=false;
    try{localStorage.setItem(OUTPUT_KEY,JSON.stringify({id:S.id,label:S.label}));}catch{}
    el('outputDevice').value=S.id;if(current())current().outputReady=false;mute();
    await apply();syncControls();
  }
  async function authorize() {
    if(S.busy||S.authorizing||S.test||!nativeRouting)return;
    S.authorizing=true;mute();refreshMain();
    let temporary=null,chosen=null;
    try {
      if(typeof navigator.mediaDevices.selectAudioOutput==='function'){
        // Must execute directly in the click activation. No await before this call.
        chosen=await navigator.mediaDevices.selectAudioOutput(S.id?{deviceId:S.id}:{});
      }else if(!current()?.stream){
        // Chromium exposes allowed output devices after microphone permission.
        // The temporary stream is never connected to a player or recorder.
        temporary=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      }
      if(temporary){temporary.getTracks().forEach(track=>{track.stop();S.permissionTrackStops++;});temporary=null;}
      await enumerate();
      if(chosen){
        if(![...el('outputDevice').options].some(o=>o.value===chosen.deviceId)){
          el('outputDevice').add(new Option(chosen.label||'Saída autorizada',chosen.deviceId));
        }
      }
      message(chosen?'Saída autorizada. Aplicando seleção…':'Permissão verificada. Escolha o dispositivo de reprodução na lista acima.');
    }catch(error){recordError(error);message(explain(error),'warn');}
    finally{
      temporary?.getTracks().forEach(track=>{track.stop();S.permissionTrackStops++;});
      S.authorizing=false;refreshMain();
    }
    if(chosen)await select(chosen.deviceId,chosen.label);
  }
  async function attach(item) {
    cancelTest();
    item.outputReady=false;
    item.context.addEventListener('sinkchange',()=>{
      if(item!==current()||S.busy)return;
      const actual=typeof item.context.sinkId==='string'?item.context.sinkId:'';
      if(item.outputId&&actual!==item.outputId){
        item.outputReady=false;mute(item);refreshMain();
        message('A saída de áudio mudou fora do aplicativo. O som ficou em espera sem desativar o retorno. Selecione e aplique a saída novamente.','warn');
      }
    });
    await apply(item);
    if(item===current())await enumerate();
  }
  function detach(item) {
    S.sequence++;S.busy=false;
    if(item)item.outputReady=false;
    cancelTest();
  }
  function cancelTest() {
    const test=S.test;if(!test)return;
    S.test=null;clearTimeout(test.timer);
    try{test.osc?.stop();test.osc?.disconnect();test.gain?.disconnect();}catch{}
    if(test.context.state!=='closed')void test.context.close().catch(()=>{});
    refreshMain();
  }
  async function testOutput() {
    if(S.test){cancelTest();refreshMain();message('Teste interrompido. Sua escolha de retorno foi mantida.');return;}
    if(S.busy||S.authorizing||S.unavailable)return;
    mute();
    // Create/resume synchronously inside the click. Do not acquire a microphone.
    const context=new AC({latencyHint:'interactive'}),test={context,osc:null,gain:null,timer:null};
    S.test=test;refreshMain();
    const resumed=context.resume();resumed.catch(()=>{});
    try {
      await route(context,S.id);await resumed;
      if(S.test!==test)return;
      const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
      test.osc=osc;test.gain=gain;osc.type='sine';osc.frequency.value=660;
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(.025,now+.04);
      gain.gain.setValueAtTime(.025,now+.28);
      gain.gain.linearRampToValueAtTime(0,now+.46);
      osc.connect(gain).connect(context.destination);osc.start(now);osc.stop(now+.5);
      message(`Som de teste em: ${S.label}. Este teste não usa o microfone.`);
      test.timer=setTimeout(()=>{
        if(S.test!==test)return;
        cancelTest();refreshMain();message('Teste concluído. O retorno volta automaticamente se o botão estiver ligado e a captura estiver ativa.');
      },850);
    }catch(error){
      if(S.test!==test)return;
      recordError(error);cancelTest();refreshMain();message(explain(error),'warn');
    }
  }
  function init() {
    S.initialized=true;
    el('outputDevice').addEventListener('change',()=>void select(el('outputDevice').value,el('outputDevice').selectedOptions[0]?.textContent));
    el('applyOutput').addEventListener('click',()=>void apply());
    el('refreshOutputs').addEventListener('click',()=>void enumerate({notify:true}));
    el('authorizeOutput').addEventListener('click',()=>void authorize());
    el('testOutput').addEventListener('click',()=>void testOutput());
    navigator.mediaDevices?.addEventListener?.('devicechange',()=>void enumerate());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelTest();});
    window.addEventListener('pagehide',()=>{detach(current());});
    if(!nativeRouting){
      el('outputCompatibility').hidden=false;
      message('Neste navegador, use a saída padrão configurada no sistema. A captura e o efeito continuam disponíveis.','warn');
    }
    syncControls();void enumerate();
  }
  return {init,attach,detach,canMonitor,syncControls,cancelTest,refresh:enumerate,
    diagnostics:()=>({nativeRouting,chosenId:S.id,chosenLabel:S.label,unavailable:S.unavailable,busy:S.busy,
      authorizing:S.authorizing,testing:!!S.test,outputReady:current()?.outputReady??null,
      appliedId:current()?.outputId??null,errors:[...S.errors],permissionTrackStops:S.permissionTrackStops,
      outputs:S.devices.map(d=>({id:d.deviceId,label:d.label})),monitorChecked:el('monitor').checked})};
})();
