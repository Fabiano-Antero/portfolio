(() => {
  'use strict';
  const header=document.querySelector('.site-header');
  const toggle=header?.querySelector('[data-mobile-menu-toggle]');
  const panel=header?.querySelector('#mobile-navigation');
  if(!toggle||!panel)return;
  const mobile=matchMedia('(max-width:767px)');
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
  const bars=[...toggle.querySelectorAll('path')];
  const language=header.querySelector('.mobile-language');
  const languageToggle=language.querySelector('[data-mobile-language]');
  const languageOptions=language.querySelector('[role="listbox"]');
  const choices=[...languageOptions.querySelectorAll('[role="option"]')];
  let open=false;
  function setLanguageOpen(value,focus=false){
    const expanded=!!value&&mobile.matches;
    languageOptions.hidden=!expanded;languageToggle.setAttribute('aria-expanded',String(expanded));
    if(focus)languageToggle.focus({preventScroll:true});
  }
  function label(){
    const locale=document.documentElement.lang;
    toggle.setAttribute('aria-label',locale==='es'?(open?'Cerrar menú':'Abrir menú'):locale==='en'?(open?'Close menu':'Open menu'):(open?'Fechar menu':'Abrir menu'));
  }
  function animateIcon(expanded,initial){
    const top=[
      {transform:'translate(-1px,6px) rotate(0deg)',offset:.25},
      {transform:'translate(-1px,6px) rotate(0deg)',offset:.36},
      {transform:'translate(-1px,6px) rotate(58deg)',offset:.65},
      {transform:'translate(-1px,6px) rotate(40deg)',offset:.82},
      {transform:'translate(-1px,6px) rotate(45deg)',offset:1}
    ];
    const bottom=top.map(frame=>({...frame,transform:frame.transform.replace('6px','-6px').replace(/rotate\((\d+)deg\)/,'rotate(-$1deg)')}));
    const opening=[top,[{transform:'translateX(-5px)',opacity:0,offset:.2},{transform:'translateX(-12px)',opacity:0,offset:1}],bottom];
    const closing=[
      [{transform:'translate(-4px,0) rotate(-16deg)',offset:.25},{transform:'translate(-1px,0) rotate(0deg)',offset:.48},{transform:'translate(1px,0) rotate(4deg)',offset:.7},{transform:'none',offset:1}],
      [{transform:'translateX(-22px)',opacity:0,offset:.42},{transform:'translateX(-20px)',opacity:1,offset:.5},{transform:'translateX(5px)',opacity:1,offset:.75},{transform:'translateX(-2px)',opacity:1,offset:.88},{transform:'none',opacity:1,offset:1}],
      [{transform:'translate(-4px,0) rotate(16deg)',offset:.25},{transform:'translate(-1px,0) rotate(0deg)',offset:.48},{transform:'translate(1px,0) rotate(-4deg)',offset:.7},{transform:'none',offset:1}]
    ];
    bars.forEach((bar,index)=>bar.animate([{...initial[index],offset:0},...(expanded?opening:closing)[index]],{duration:expanded?520:640,easing:'cubic-bezier(.22,.61,.36,1)'}));
  }
  function setOpen(value,focus=false,motion=true){
    const next=!!value&&mobile.matches,changed=next!==open;
    const initial=bars.map(bar=>{const style=getComputedStyle(bar);return {transform:style.transform,opacity:style.opacity};});
    bars.forEach(bar=>bar.getAnimations().forEach(animation=>animation.cancel()));
    const links=[...panel.querySelectorAll('a')];
    links.forEach(link=>link.getAnimations().forEach(animation=>animation.cancel()));
    open=next;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));label();
    if(changed&&motion&&mobile.matches&&!reducedMotion.matches){
      animateIcon(open,initial);
      if(open)links.forEach((link,index)=>link.animate([{opacity:0,transform:'translateX(14px)'},{opacity:1,transform:'none'}],{duration:260,delay:150+index*45,easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'}));
    }
    if(focus)toggle.focus({preventScroll:true});
  }
  header.classList.add('mobile-menu-ready');setOpen(false);
  toggle.addEventListener('click',()=>{setLanguageOpen(false);setOpen(!open);});
  languageToggle.addEventListener('click',()=>setLanguageOpen(languageOptions.hidden));
  languageOptions.addEventListener('click',event=>{if(event.target.closest('[role="option"]'))setLanguageOpen(false,true);});
  language.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!languageOptions.hidden){event.preventDefault();event.stopPropagation();setLanguageOpen(false,true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();
    const current=choices.indexOf(document.activeElement);
    const index=event.key==='Home'?0:event.key==='End'?choices.length-1:current<0?choices.findIndex(choice=>choice.getAttribute('aria-selected')==='true'):(current+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;
    setLanguageOpen(true);choices[Math.max(0,index)].focus({preventScroll:true});
  });
  panel.addEventListener('click',event=>{if(event.target.closest('a[href]'))setOpen(false);});
  document.addEventListener('pointerdown',event=>{if(open&&!header.contains(event.target))setOpen(false);if(!language.contains(event.target))setLanguageOpen(false);},{passive:true});
  language.addEventListener('focusout',event=>{if(!language.contains(event.relatedTarget))setLanguageOpen(false);});
  document.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){event.preventDefault();setOpen(false,true);}});
  document.addEventListener('portfolio:language',label);
  mobile.addEventListener('change',()=>{setOpen(false,false,false);setLanguageOpen(false);});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)bars.forEach(bar=>bar.getAnimations().forEach(animation=>animation.cancel()));});
  window.addEventListener('pagehide',()=>{setOpen(false,false,false);setLanguageOpen(false);});
})();
