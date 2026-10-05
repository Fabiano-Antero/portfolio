(() => {
  'use strict';
  const strip=document.querySelector('.skills-marquee');
  if(!strip) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=!('IntersectionObserver' in window), suspended=false;
  const update=()=>strip.classList.toggle('is-running',visible&&!suspended&&!document.hidden&&!reduced.matches);
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});
    observer.observe(strip);
  }
  document.addEventListener('visibilitychange',update);
  reduced.addEventListener('change',update);
  window.addEventListener('pagehide',()=>{suspended=true;update();});
  window.addEventListener('pageshow',()=>{suspended=false;update();});
  update();
})();
