'use strict';
// Dialog nativo: foco contido no painel, fechamento com Esc e retorno ao acionador.
const drawer=$('settingsDrawer'), trigger=$('settingsTrigger');
function openLocalSettings(){
  if(drawer.open)return;
  const premium=document.getElementById('premiumDialog');
  if(premium?.open)premium.close();
  drawer.showModal();trigger.setAttribute('aria-expanded','true');
}
function closeSettings(){if(drawer.open)drawer.close();}
function openSettings(){openLocalSettings();}
trigger.addEventListener('click',openSettings);
$('closeSettings').addEventListener('click',closeSettings);
drawer.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');if(!document.getElementById('premiumDialog')?.open)trigger.focus({preventScroll:true});});
let backdropDown=false;
function outsideDrawer(event){const r=drawer.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;}
drawer.addEventListener('pointerdown',event=>{backdropDown=event.target===drawer&&outsideDrawer(event);});
drawer.addEventListener('click',event=>{if(backdropDown&&event.target===drawer&&outsideDrawer(event))closeSettings();backdropDown=false;});
document.addEventListener('keydown',event=>{
  if(event.altKey&&!event.ctrlKey&&!event.metaKey&&event.key===','){event.preventDefault();drawer.open?closeSettings():openSettings();}
});
const tabs=Array.from(drawer.querySelectorAll('[role="tab"]'));
function activateTab(tab,focus=false){
  for(const candidate of tabs){const selected=candidate===tab;candidate.setAttribute('aria-selected',String(selected));candidate.tabIndex=selected?0:-1;$(candidate.getAttribute('aria-controls')).hidden=!selected;}
  drawer.querySelector('.drawer-scroll').scrollTop=0;
  if(focus)tab.focus();
}
for(const tab of tabs){
  tab.addEventListener('click',()=>activateTab(tab));
  tab.addEventListener('keydown',event=>{
    const index=tabs.indexOf(tab);let next=null;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    if(next!==null){event.preventDefault();activateTab(tabs[next],true);}
  });
}
for(const range of document.querySelectorAll('input[type="range"]'))range.addEventListener('input',syncRangeFills);
function updateVisualLabels(){
  const wave=$('mode').value==='wave';
  $('horizontalAxis').textContent=wave?'DOMÍNIO DO TEMPO':'FREQUÊNCIAS / 60 Hz → 12 kHz';
  document.querySelector('.axis-right').textContent=wave?'AMPLITUDE / NORMALIZADA':'INTENSIDADE / RELATIVA';
  const labels=wave?['+1.0','+0.5','0.00','−0.5','−1.0']:['1.00','0.75','0.50','0.25','0.00'];
  document.querySelectorAll('.axis-y span').forEach((node,i)=>{node.textContent=labels[i];});
  canvas.setAttribute('aria-label',wave?'Forma de onda do áudio tratado pelo microfone':'Espectro de frequências do áudio tratado pelo microfone');
}
$('mode').addEventListener('change',updateVisualLabels);updateVisualLabels();syncRangeFills();
const fullButton=$('fullscreenButton');
if(!document.documentElement.requestFullscreen){fullButton.disabled=true;$('fullscreenHint').textContent='Tela cheia não está disponível neste navegador.';}
fullButton.addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else{const request=document.documentElement.requestFullscreen();closeSettings();await request;}
  }catch{$('fullscreenHint').textContent='O navegador bloqueou a tela cheia. Você pode continuar usando a interface normalmente.';openLocalSettings();}
});
document.addEventListener('fullscreenchange',()=>{fullButton.textContent=document.fullscreenElement?'Sair da tela cheia':'Entrar em tela cheia';});
