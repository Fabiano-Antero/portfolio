(() => {
  'use strict';
  const root=document.querySelector('.hero-blueprint');
  const art=document.querySelector('.hero-sequence'),copy=document.querySelector('.hero-copy');
  if(!root||!art||!copy)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let started=false,complete=false,suspended=false,visible=!('IntersectionObserver' in window);
  let motion,visibility;
  root.querySelectorAll('.blueprint-growth').forEach(path=>path.setAttribute('pathLength','1'));
  root.querySelectorAll('[data-blueprint-text]').forEach((text,textIndex)=>{
    const value=text.textContent;
    text.textContent='';
    text.style.setProperty('--text-delay',`${textIndex*.07}s`);
    for(const [index,character] of [...value].entries()){
      const letter=text.namespaceURI==='http://www.w3.org/2000/svg'
        ?document.createElementNS(text.namespaceURI,'tspan'):document.createElement('span');
      letter.classList.add('blueprint-character');
      letter.style.setProperty('--character-index',index);
      letter.textContent=character;
      text.append(letter);
    }
  });
  const finish=()=>{
    complete=true;
    root.classList.remove('is-blueprint-running');
    root.dataset.motionState='complete';
    motion?.disconnect();visibility?.disconnect();
  };
  const update=()=>{
    if(complete)return;
    if(reduced.matches){finish();return;}
    root.style.setProperty('--blueprint-play-state',visible&&!suspended&&!document.hidden?'running':'paused');
    // The existing portrait/skills and title/supporting content must both finish.
    if(started||art.dataset.motionState!=='complete'||copy.classList.contains('is-copy-animating')||copy.classList.contains('is-copy-preparing'))return;
    started=true;
    root.dataset.motionState='running';
    root.classList.add('is-blueprint-running');
    Promise.allSettled(root.getAnimations({subtree:true}).map(animation=>animation.finished)).then(()=>{
      if(!complete)finish();
    });
  };
  motion=new MutationObserver(update);
  motion.observe(art,{attributes:true,attributeFilter:['data-motion-state']});
  motion.observe(copy,{attributes:true,attributeFilter:['class']});
  if('IntersectionObserver' in window){
    visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});
    visibility.observe(root.closest('.hero'));
  }
  document.addEventListener('visibilitychange',update);
  reduced.addEventListener('change',update);
  window.addEventListener('pagehide',()=>{suspended=true;update();});
  window.addEventListener('pageshow',()=>{suspended=false;update();});
  update();
})();
