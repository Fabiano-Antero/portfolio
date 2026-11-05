'use strict';
/**
 * UI-only localization adapter. Deliberately never restarts capture, touches
 * AudioParams, changes form values (except language), or rewrites media sources.
 * WeakMaps retain Portuguese originals so translated live labels switch back
 * correctly. The observer only processes changed text and accessibility labels.
 */
window.VozI18n=(() => {
  const dictionary=window.VOZ_EN||{};
  const STORAGE_KEY='voz.interface.language.v13';
  const sourceText=new WeakMap(),sourceAttributes=new WeakMap();
  const attrs=['aria-label','title','alt','placeholder'];
  const selector=attrs.map(a=>`[${a}]`).join(',');
  const control=document.getElementById('interfaceLanguage');
  let locale='pt-BR',observer=null,busy=false;
  try{const saved=localStorage.getItem(STORAGE_KEY);if(saved==='en'||saved==='pt-BR')locale=saved;}catch{}
  const names={'Assistente IA':'AI Assistant','Androide':'Android','Robô digital':'Digital Robot'};
  const nativeState={'ativo':'on','desligado':'off','não informado':'not reported'};
  const outputName=s=>dictionary[s]||s; // OS device names are never freely translated.
  function dynamic(s){
    let m;
    if((m=s.match(/^Retorno suave · (\d+) ms$/)))return `Smooth return · ${m[1]} ms`;
    if((m=s.match(/^([+−-]?[\d,.]+) semitons$/)))return `${m[1].replace(',','.')} semitones`;
    if((m=s.match(/^([+−-]?\d+) dB · ([\d,]+)×$/)))return `${m[1]} dB · ${m[2].replace(',','.')}×`;
    if((m=s.match(/^Microfone (\d+)$/)))return `Microphone ${m[1]}`;
    if((m=s.match(/^Saída de áudio (\d+)$/)))return `Audio output ${m[1]}`;
    if(s==='FX / ANDROIDE')return 'FX / ANDROID';
    if(s==='FX / ROBÔ')return 'FX / ROBOT';
    if((m=s.match(/^(Assistente IA|Androide|Robô digital) · (\d+)%((?: · preparado)?) · (retorno ligado · em espera|retorno ligado|retorno desligado)$/)))
      return `${names[m[1]]} · ${m[2]}%${m[3]?' · ready':''} · ${m[4]==='retorno ligado · em espera'?'monitoring on · waiting':m[4]==='retorno ligado'?'monitoring on':'monitoring off'}`;
    if((m=s.match(/^Voz original · efeito ignorado((?: · preparado)?) · (retorno ligado · em espera|retorno ligado|retorno desligado)$/)))
      return `Original voice · effect bypassed${m[1]?' · ready':''} · ${m[2]==='retorno ligado · em espera'?'monitoring on · waiting':m[2]==='retorno ligado'?'monitoring on':'monitoring off'}`;
    if((m=s.match(/^Compressor: ([\d.]+) dB de redução · Limitador: ([\d.]+) dB de redução\.$/)))return `Compressor: ${m[1]} dB reduction · Limiter: ${m[2]} dB reduction.`;
    if((m=s.match(/^Atenuação suave: ([\d.]+) dB · sem silenciar totalmente$/)))return `Gentle attenuation: ${m[1]} dB · never fully muted`;
    if((m=s.match(/^Informado pelo navegador: redução de ruído (ativo|desligado|não informado); eco (ativo|desligado|não informado); ganho automático (ativo|desligado|não informado)\.(.*)$/)))
      return `Reported by browser: noise suppression ${nativeState[m[1]]}; echo cancellation ${nativeState[m[2]]}; automatic gain ${nativeState[m[3]]}.${m[4]?' The browser kept a different setting; controls show its reported state.':''}`;
    if((m=s.match(/^Ruído estimado: ([-\d]+) dBFS\. Referência: ([-\d]+) dBFS\. Atenuação extra (ativada|desativada)\.(.*)$/)))return `Estimated noise: ${m[1]} dBFS. Threshold: ${m[2]} dBFS. Extra attenuation ${m[3]==='ativada'?'enabled':'disabled'}.${m[4]?' Noisy environment: move closer to the microphone and reduce noise sources.':''}`;
    if((m=s.match(/^Ganho ajustado para ([+−\d]+) dB\.(.*)$/)))return `Gain adjusted to ${m[1]} dB.${m[2].includes('fraca')?' Input is still weak: check the microphone and system input level.':' Enable monitoring with headphones and fine-tune the volume if needed.'}`;
    if((m=s.match(/^Não foi possível aplicar \(([^)]+)\)\. Confira os ajustes e reinicie a captura\.$/)))return `Unable to apply (${m[1]}). Check the settings and restart capture.`;
    if((m=s.match(/^Preparado: (.+)\. Use Testar saída ou ative o microfone\.$/)))return `Ready: ${outputName(m[1])}. Use Test output or enable the microphone.`;
    if((m=s.match(/^Aplicando saída: (.+)…$/)))return `Applying output: ${outputName(m[1])}…`;
    if((m=s.match(/^Saída aplicada: (.+)\. A preferência do retorno foi mantida\.$/)))return `Output applied: ${outputName(m[1])}. Your monitoring preference is preserved.`;
    if((m=s.match(/^Som de teste em: (.+)\. Este teste não usa o microfone\.$/)))return `Test sound on: ${outputName(m[1])}. This test does not use the microphone.`;
    if((m=s.match(/^(.+) · indisponível$/)))return `${outputName(m[1])} · unavailable`;
    const wait=' O som ficará em espera; a preferência do retorno foi mantida.';
    if(s.endsWith(wait))return (dictionary[s.slice(0,-wait.length)]||s.slice(0,-wait.length))+' Sound is waiting; your monitoring preference is preserved.';
    return s;
  }
  function english(value){return dictionary[value]||dynamic(value);}
  function translate(value){return locale==='en'?english(value):value;}
  function excluded(element){
    if(!element||element.closest('script,style,[data-i18n-ignore]'))return true;
    // Physical device labels come from the OS, not from this UI dictionary.
    if(element.tagName==='OPTION'&&['device','outputDevice'].includes(element.parentElement?.id)&&element.value){
      const label=element.textContent.trim();
      return !/^(Microfone \d+|Saída de áudio \d+|.* · indisponível)$/.test(label);
    }
    return false;
  }
  function text(node){
    if(excluded(node.parentElement))return;
    const current=node.nodeValue;if(!current?.trim())return;
    const previous=sourceText.get(node);
    const original=previous&&previous.rendered===current?previous.original:current;
    const trimmed=original.trim();
    const converted=locale==='en'&&node.parentElement?.id==='sampleRate'?trimmed.replace(',','.'):translate(trimmed);
    const rendered=converted===trimmed?original:original.replace(trimmed,()=>converted);
    sourceText.set(node,{original,rendered});
    if(current!==rendered)node.nodeValue=rendered;
  }
  function attributes(element){
    if(excluded(element))return;
    const records=sourceAttributes.get(element)||new Map();
    for(const attr of attrs){
      if(!element.hasAttribute(attr))continue;
      const current=element.getAttribute(attr),previous=records.get(attr);
      const original=previous&&previous.rendered===current?previous.original:current;
      const rendered=translate(original);
      records.set(attr,{original,rendered});
      if(current!==rendered)element.setAttribute(attr,rendered);
    }
    sourceAttributes.set(element,records);
  }
  function scan(root){
    if(root.nodeType===Node.TEXT_NODE){text(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
    if(root.nodeType===Node.ELEMENT_NODE){if(excluded(root))return;attributes(root);}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode:n=>excluded(n.parentElement)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT
    });
    while(walker.nextNode())text(walker.currentNode);
    for(const element of root.querySelectorAll(selector))attributes(element);
  }
  function applyRecords(records){
    for(const r of records){
      if(r.type==='characterData')text(r.target);
      else if(r.type==='attributes')attributes(r.target);
      else for(const n of r.addedNodes)if(n.isConnected)scan(n);
    }
  }
  function observe(){observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});}
  function refresh(root=document.documentElement){
    if(busy)return;busy=true;
    const pending=observer?.takeRecords()||[];observer?.disconnect();
    try{applyRecords(pending);scan(root);}finally{busy=false;observe();}
  }
  function setLanguage(value){
    if(value!=='pt-BR'&&value!=='en')return;
    locale=value;control.value=value;document.documentElement.lang=value;
    try{localStorage.setItem(STORAGE_KEY,value);}catch{}
    const feedback=document.getElementById('languageFeedback');feedback.textContent='Idioma atualizado.';
    refresh();window.dispatchEvent(new CustomEvent('voz:languagechange',{detail:{language:value}}));
  }
  observer=new MutationObserver(records=>{
    if(busy)return;busy=true;observer.disconnect();
    try{applyRecords(records);}finally{busy=false;observe();}
  });
  document.documentElement.lang=locale;control.value=locale;refresh();
  control.addEventListener('change',()=>setLanguage(control.value));
  return Object.freeze({get language(){return locale;},setLanguage,refresh,t:translate});
})();
