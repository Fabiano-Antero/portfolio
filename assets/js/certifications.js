(() => {
 'use strict';
 const viewport=document.querySelector('[data-certifications-viewport]');if(!viewport)return;
 const track=viewport.querySelector('.certifications-track'),cards=[...track.children];
 const position=document.querySelector('[data-certificate-position]'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const count=cards.length,speed=24,copies=[];
 const clone=card=>{const copy=card.cloneNode(true);copy.dataset.certificateClone='';copy.setAttribute('aria-hidden','true');copy.tabIndex=-1;copies.push(copy);return copy;};
 // Three identical groups allow both the automatic loop and previous/next
 // navigation to cross the ends without exposing an empty edge.
 track.replaceChildren(...cards.map(clone),...cards,...cards.map(clone));
 viewport.classList.add('is-carousel-ready');
 let animation,seek,step=0,distance=0,duration=0,inView=false,hovered=false,focused=false,suspended=false,timer=0,index=0,swipe=null;
 const modulo=(value,base)=>((value%base)+base)%base;
 const offset=()=>animation?modulo(Number(animation.currentTime||0)/duration,1)*distance:0;
 const eligible=()=>inView&&!hovered&&!focused&&!suspended&&!document.hidden&&!reduced.matches&&!seek;
 function mark(value){index=modulo(value,count);position.textContent=String(index+1).padStart(2,'0');}
 function tick(){clearTimeout(timer);if(!eligible())return;mark(Math.floor(offset()/step+1e-6));timer=setTimeout(tick,500);}
 function update(){if(!animation)return;if(eligible())animation.play();else animation.pause();tick();}
 function resize(){
  const nextStep=parseFloat(getComputedStyle(cards[0]).width)+parseFloat(getComputedStyle(track).columnGap);if(!nextStep||Math.abs(nextStep-step)<.01)return;
  const phase=duration&&animation?modulo(Number(animation.currentTime||0)/duration,1):0;
  seek?.cancel();seek=null;animation?.cancel();step=nextStep;distance=step*count;duration=distance/speed*1000;
  animation=track.animate([{transform:`translateX(${-distance}px)`},{transform:`translateX(${-2*distance}px)`}],{duration,iterations:Infinity,easing:'linear'});
  animation.currentTime=phase*duration;update();
 }
 function show(value,animate=true){
  if(!animation)return;
  const target=modulo(value,count),currentOffset=offset();
  // Take the closest route through the copies, including from first to last.
  let targetOffset=target*step;if(targetOffset-currentOffset>distance/2)targetOffset-=distance;if(currentOffset-targetOffset>distance/2)targetOffset+=distance;
  const from=getComputedStyle(track).transform;seek?.cancel();seek=null;animation.pause();clearTimeout(timer);
  const complete=()=>{animation.currentTime=target*step/speed*1000;seek?.cancel();seek=null;mark(target);viewport.scrollLeft=0;update();};
  mark(target);
  if(!animate||reduced.matches){complete();return;}
  const motion=track.animate([{transform:from},{transform:`translateX(${-distance-targetOffset}px)`}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  seek=motion;motion.finished.then(()=>{if(seek===motion)complete();}).catch(()=>{});
 }
 document.querySelector('[data-certificate-prev]').addEventListener('click',()=>show(index-1));
 document.querySelector('[data-certificate-next]').addEventListener('click',()=>show(index+1));
 viewport.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;update();}});
 viewport.addEventListener('pointerleave',()=>{hovered=false;update();});
 viewport.addEventListener('focusin',event=>{focused=true;const card=event.target.closest('.certification-card');if(card&&!card.hasAttribute('data-certificate-clone'))show(Number(card.dataset.certificateIndex),false);else update();});
 viewport.addEventListener('focusout',()=>{focused=viewport.contains(document.activeElement);update();});
 viewport.addEventListener('keydown',event=>{if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;event.preventDefault();const next=modulo(index+(event.key==='ArrowRight'?1:-1),count);show(next,false);cards[next].focus({preventScroll:true});});
 viewport.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')swipe=event.clientX;},{passive:true});
 viewport.addEventListener('pointerup',event=>{if(swipe===null)return;const delta=event.clientX-swipe;swipe=null;if(Math.abs(delta)>40)show(index+(delta<0?1:-1));},{passive:true});
 viewport.addEventListener('pointercancel',()=>{swipe=null;},{passive:true});
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(viewport);resize();
 if('IntersectionObserver'in window){const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();});visibility.observe(viewport);}else{inView=true;update();}
 document.addEventListener('visibilitychange',update);reduced.addEventListener('change',()=>{if(seek){show(index,false);}update();});
 window.addEventListener('pagehide',()=>{suspended=true;update();});window.addEventListener('pageshow',()=>{suspended=false;update();});
 document.addEventListener('portfolio:language',()=>{copies.forEach(copy=>copy.replaceChildren(...[...cards[Number(copy.dataset.certificateIndex)].childNodes].map(node=>node.cloneNode(true))));});
})();
