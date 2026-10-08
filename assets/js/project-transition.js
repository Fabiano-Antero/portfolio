(() => {
  'use strict';
  // Embedded previews must not consume the top-level navigation handoff.
  if(window.self!==window.top)return;
  const key='portfolio-project-transition';
  const defaultWords='PRODUCT THINKING   ✦   UX STRATEGY   ✦   UI DESIGN   ✦   DESIGN SYSTEMS   ✦   PROTOTYPING   ✦   FRONT-END   ✦   ACCESSIBILITY   ✦   ';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Production redirects .html links to clean URLs; both identify one document.
  const documentPath=url=>url.pathname.replace(/\.html$/,'').replace(/\/index\/?$/,'/').replace(/\/$/,'')||'/';
  const sameDocument=(a,b)=>a.origin===b.origin&&documentPath(a)===documentPath(b)&&a.search===b.search;
  const canonical=url=>url.origin+documentPath(url)+url.search+url.hash;
  const clearPending=()=>{try{sessionStorage.removeItem(key);}catch{}};
  let pending;
  try{pending=JSON.parse(sessionStorage.getItem(key));}catch{}
  clearPending();
  let incoming=false;
  try{incoming=!!pending&&typeof pending.url==='string'&&Date.now()-pending.created>=0&&Date.now()-pending.created<20000
    &&canonical(new URL(pending.url,location.href))===canonical(new URL(location.href))&&!reduced.matches;}catch{}
  let overlay,bands=[],animations=[],busy=false,run=0,watchdog,locked=false,previousInert=false,previousFocus,activeDestination;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const blockScroll=event=>event.preventDefault();
  function lock(){
    if(document.body&&!locked){previousInert=document.body.inert;document.body.inert=true;locked=true;}
  }
  function cleanup(){
    run++;clearTimeout(watchdog);animations.forEach(animation=>animation.cancel());animations=[];
    overlay?.remove();overlay=undefined;bands=[];busy=false;activeDestination=undefined;
    window.removeEventListener('wheel',blockScroll);window.removeEventListener('touchmove',blockScroll);
    if(locked){document.body.inert=previousInert;locked=false;}
    if(previousFocus?.isConnected)previousFocus.focus?.({preventScroll:true});previousFocus=undefined;
  }
  function size(){
    if(!overlay)return;
    // Project the viewport into the rotated plane, including its four corners.
    const angle=14*Math.PI/180,margin=96;
    const width=innerWidth*Math.cos(angle)+innerHeight*Math.sin(angle)+margin;
    const height=innerHeight*Math.cos(angle)+innerWidth*Math.sin(angle)+margin;
    overlay.style.setProperty('--transition-width',`${width}px`);
    overlay.style.setProperty('--transition-height',`${height}px`);
    overlay.style.setProperty('--band-height',`${height/8}px`);
  }
  function create(closed=false,words){
    busy=true;previousFocus=document.activeElement;
    window.addEventListener('wheel',blockScroll,{passive:false});window.addEventListener('touchmove',blockScroll,{passive:false});
    overlay=document.createElement('div');overlay.className='project-transition';
    overlay.dataset.noTranslate='';overlay.dataset.phase=closed?'covered':'closing';overlay.lang='en';
    overlay.setAttribute('aria-hidden','true');overlay.inert=true;
    const plane=document.createElement('div');plane.className='project-transition-plane';
    const text=words||document.querySelector('.skills-marquee-group')?.textContent||defaultWords;
    for(let index=0;index<8;index++){
      const band=document.createElement('div');band.className='project-transition-band';
      band.style.setProperty('--band-index',index);band.style.setProperty('--band-offset',index%2?'110%':'-110%');
      band.style.setProperty('--word-delay',`${-index*2.5}s`);
      if(closed)band.style.transform='translate3d(0,0,0)';
      const track=document.createElement('div');track.className='project-transition-track';
      for(let copy=0;copy<2;copy++){
        const group=document.createElement('span');group.className='project-transition-words';group.textContent=text;track.append(group);
      }
      band.append(track);plane.append(band);bands.push(band);
    }
    overlay.append(plane);
    // Incoming curtains mount in the head phase, before any content is painted.
    (document.body||document.documentElement).append(overlay);size();lock();
    watchdog=setTimeout(()=>{clearPending();cleanup();},10000);
    return text;
  }
  async function animate(opening){
    const active=++run;
    const oldAnimations=animations;
    bands.forEach(band=>{band.style.transform='translate3d(0,0,0)';});
    oldAnimations.forEach(animation=>animation.cancel());
    overlay.dataset.phase=opening?'opening':'closing';
    animations=bands.map((band,index)=>{
      const offset=band.style.getPropertyValue('--band-offset');
      const hidden=`translate3d(${offset},0,0)`,shown='translate3d(0,0,0)';
      return band.animate([{transform:opening?shown:hidden},{transform:opening?hidden:shown}],{
        duration:430,delay:(opening?7-index:index)*30,easing:'cubic-bezier(.76,0,.24,1)',fill:'both'
      });
    });
    await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
    if(active!==run||!overlay)return false;
    if(!opening)overlay.dataset.phase='covered';
    return true;
  }
  async function reveal(){if(overlay&&await animate(true))cleanup();}
  async function ready(){
    if(!overlay)return;
    if(document.body&&overlay.parentElement!==document.body)document.body.append(overlay);
    lock();
    let target;
    try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{}
    if(target){target.scrollIntoView({behavior:'instant',block:'start'});if(!target.hasAttribute('tabindex'))target.tabIndex=-1;}
    const images=[...document.images].filter(image=>{const bounds=image.getBoundingClientRect();return bounds.bottom>0&&bounds.top<innerHeight;}).slice(0,6);
    await Promise.race([Promise.allSettled([document.fonts.ready,...images.map(image=>image.decode())]),wait(450)]);
    if(!overlay)return;
    await frame();if(!overlay)return;
    await reveal();target?.focus({preventScroll:true});
  }
  if(incoming){
    create(true,typeof pending.words==='string'?pending.words.slice(0,1000):defaultWords);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  }
  function destination(link){
    if(!link||link.hasAttribute('download')||link.dataset.noTransition!==undefined||link.closest('.project-transition'))return;
    if(link.target&&link.target!=='_self')return;
    let url;try{url=new URL(link.href,location.href);}catch{return;}
    if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol))return;
    const file=documentPath(url).split('/').pop();
    const isProjectPage=['projetos','ordiny','cash-advance','sandfit'].includes(file);
    const isProjectSection=documentPath(url)==='/'&&url.hash==='#projetos';
    if(!(isProjectPage||isProjectSection)||canonical(url)===canonical(new URL(location.href)))return;
    // Chapter links inside a case are controls, rather than page transitions.
    if(url.hash&&!isProjectSection&&sameDocument(url,new URL(location.href)))return;
    return url;
  }
  async function navigate(url){
    activeDestination=url;
    const words=create();
    try{
      if(!await animate(false))return;
      const current=new URL(location.href);
      if(sameDocument(url,current)){
        const target=document.getElementById(decodeURIComponent(url.hash.slice(1)));
        history.pushState(history.state,'',url.href);
        if(target){
          target.scrollIntoView({behavior:'instant',block:'start'});
          if(!target.hasAttribute('tabindex'))target.tabIndex=-1;
        }
        await reveal();target?.focus({preventScroll:true});return;
      }
      try{sessionStorage.setItem(key,JSON.stringify({url:url.href,created:Date.now(),words}));}catch{}
      location.assign(url.href);
    }catch{clearPending();cleanup();location.assign(url.href);}
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||reduced.matches||!Element.prototype.animate)return;
    const link=event.target.closest?.('a[href]');
    const url=destination(link);if(!url)return;
    event.preventDefault();if(busy)return;navigate(url);
  });
  // Warm only HTML destinations the visitor actually approaches.
  const prefetched=new Set();
  const prefetch=event=>{
    const url=destination(event.target.closest?.('a[href]'));if(!url||reduced.matches)return;
    const path=documentPath(url);
    if(sameDocument(url,new URL(location.href))||prefetched.has(path)||prefetched.size>=4)return;
    const hint=document.createElement('link');hint.rel='prefetch';hint.as='document';hint.href=url.origin+url.pathname+url.search;
    document.head.append(hint);prefetched.add(path);
  };
  document.addEventListener('pointerover',prefetch,{passive:true});document.addEventListener('focusin',prefetch);
  window.addEventListener('resize',size);
  document.addEventListener('keydown',event=>{
    if(!busy)return;
    if(event.key==='Escape'){event.preventDefault();clearPending();cleanup();}
    else if([' ','ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key))event.preventDefault();
  });
  reduced.addEventListener('change',()=>{if(reduced.matches){const url=activeDestination;clearPending();cleanup();if(url)location.assign(url.href);}});
  window.addEventListener('pagehide',cleanup);
  window.addEventListener('pageshow',event=>{if(event.persisted){clearPending();cleanup();}});
})();
