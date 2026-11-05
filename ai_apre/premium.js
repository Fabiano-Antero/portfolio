'use strict';
/** In-page demonstration only: never opens media, debits credits or calls a payment API. */
(() => {
  const dialog=document.getElementById('premiumDialog');
  const trigger=document.getElementById('premiumTrigger');
  const services=new Map([
    ['hug',{name:'Abraço',credits:5}],['listen',{name:'Escuta atenta',credits:8}],
    ['words',{name:'Palavras de carinho',credits:3}],['company',{name:'Companhia',credits:10}],
    ['hands',{name:'Mãos dadas',credits:5}],['affection',{name:'Pacote de afeto',credits:14}]
  ]);
  const el=id=>document.getElementById(id);
  let selected=null,confirmed=false,backdropDown=false;
  function renderSelection(){
    document.querySelectorAll('[data-select-service]').forEach(button=>{
      const active=button.dataset.selectService===selected;
      button.setAttribute('aria-pressed',String(active));
      button.querySelector('span').textContent=active?'Selecionado':'Selecionar';
      button.closest('.premium-card').dataset.selected=String(active);
    });
    const service=services.get(selected);
    el('premiumSelection').hidden=!service;
    if(service){
      el('premiumSelectedName').textContent=service.name;
      el('premiumSelectedPrice').textContent=String(service.credits);
      el('confirmPremium').disabled=confirmed;
      el('confirmPremium').textContent=confirmed?'Seleção confirmada':'Confirmar seleção';
    }
    el('premiumFeedback').hidden=!confirmed;
    if(confirmed)el('premiumFeedback').textContent='Seleção confirmada nesta demonstração. Nenhum crédito foi cobrado e nenhum serviço foi contratado.';
    window.VozI18n?.refresh(dialog);
  }
  function open(){
    if(dialog.open)return;
    const settings=el('settingsDrawer');if(settings.open)settings.close();
    dialog.showModal();trigger.setAttribute('aria-expanded','true');
    dialog.querySelector('.premium-scroll').scrollTop=0;
  }
  function close(){if(dialog.open)dialog.close();}
  trigger.addEventListener('click',open);
  el('closePremium').addEventListener('click',close);
  el('backToStudio').addEventListener('click',close);
  dialog.addEventListener('close',()=>{
    trigger.setAttribute('aria-expanded','false');
    if(!el('settingsDrawer').open)trigger.focus({preventScroll:true});
  });
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',e=>{backdropDown=e.target===dialog&&outside(e);});
  dialog.addEventListener('click',e=>{if(backdropDown&&e.target===dialog&&outside(e))close();backdropDown=false;});
  document.addEventListener('keydown',e=>{
    if(e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='p'){
      e.preventDefault();dialog.open?close():open();
    }
  });
  for(const button of document.querySelectorAll('[data-select-service]'))button.addEventListener('click',()=>{
    const key=button.dataset.selectService;if(!services.has(key))return;
    selected=key;confirmed=false;renderSelection();
    const panel=el('premiumSelection'),viewport=dialog.querySelector('.premium-scroll');
    const b=panel.getBoundingClientRect(),v=viewport.getBoundingClientRect();
    if(b.top<v.top||b.bottom>v.bottom)panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
    el('confirmPremium').focus({preventScroll:true});
  });
  el('confirmPremium').addEventListener('click',()=>{
    if(!services.has(selected)||confirmed)return;
    confirmed=true;renderSelection();
    el('premiumFeedback').scrollIntoView({behavior:'auto',block:'nearest'});
    el('premiumFeedback').tabIndex=-1;el('premiumFeedback').focus({preventScroll:true});
  });
  window.premiumDiagnostics=()=>({version:13,open:dialog.open,selected,confirmed,services:services.size,paymentsEnabled:false,charges:0});
})();
