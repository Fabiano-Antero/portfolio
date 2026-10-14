(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const toggle=document.querySelector('.al-menu-toggle'),menu=document.querySelector('#al-mobile-menu');
 function closeMenu(focus=false){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menu');if(focus)toggle.focus({preventScroll:true});}
 toggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});
 menu.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
 document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!event.target.closest('.al-header'))closeMenu();},{passive:true});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden)closeMenu(true);});
 matchMedia('(min-width:1200px)').addEventListener('change',()=>closeMenu());
 const scenes=[...document.querySelectorAll('[data-art-scale]')];
 function resizeArt(){for(const scene of scenes){const basis=Number(getComputedStyle(scene).getPropertyValue('--design-width'));scene.style.setProperty('--art-scale',scene.clientWidth/basis);}}
 new ResizeObserver(resizeArt).observe(document.body);resizeArt();
 const motionTargets=[...document.querySelectorAll('.hero-copy,.hero-visual,.about-copy,.about-visual,.quality-card,.service-heading,.service-card,.reviews-heading,.reviews-scroller,.contact-copy,.contact-form,.newsletter,.footer-columns')];
 if('IntersectionObserver'in window){
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('al-motion-visible',entry.isIntersecting||entry.target.contains(document.activeElement))),{threshold:.04});
  motionTargets.forEach(target=>{target.classList.add('al-motion');reveal.observe(target);});
  document.addEventListener('focusin',event=>event.target.closest('.al-motion')?.classList.add('al-motion-visible'));
 }
 const topLinks=[...document.querySelectorAll('.al-nav a')],sections=[...document.querySelectorAll('#inicio,#quem-somos,#servicos,#contato')];
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)for(const link of topLinks){if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}},{rootMargin:'-15% 0px -65% 0px'});sections.forEach(section=>observer.observe(section));}
 document.querySelectorAll('form[data-demo-form]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const message=form.querySelector('.form-status');message.hidden=false;message.textContent=form.dataset.demoForm==='newsletter'?'Inscrição simulada. Esta é uma demonstração do portfólio; nenhum dado foi enviado ou armazenado.':form.dataset.demoForm==='quote'?'Pedido de orçamento simulado. Esta é uma demonstração do portfólio; nenhum dado foi enviado ou armazenado.':'Mensagem validada nesta demonstração. Nenhum dado foi enviado ou armazenado.';}));
 document.querySelectorAll('[data-demo-social]').forEach(button=>button.addEventListener('click',()=>{const status=document.querySelector('.social-status');status.hidden=false;status.textContent='O perfil do '+button.dataset.demoSocial+' faz parte desta demonstração do portfólio.';}));
 const dialog=document.querySelector('.service-dialog'),dialogContent=dialog.querySelector('.service-dialog-content');
 let activeService='',opener;
 const services=new Map([...document.querySelectorAll('.service-card')].map(card=>[card.id.replace('servico-',''),card]));
 document.querySelectorAll('[data-service-open]').forEach(button=>button.addEventListener('click',()=>{activeService=button.dataset.serviceOpen;const card=services.get(activeService);if(!card)return;opener=button;dialogContent.replaceChildren();const title=document.createElement('h2');title.id='service-dialog-title';title.textContent=card.querySelector('h3').textContent;dialogContent.append(title,card.querySelector('.service-items').cloneNode(true));dialog.showModal();}));
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
 dialog.querySelector('[data-dialog-quote]').addEventListener('click',()=>{dialog.close();const chosen=document.querySelector('.chosen-service');chosen.textContent='Serviço: '+services.get(activeService).querySelector('h3').textContent;chosen.hidden=false;document.querySelector('#quote-service').value=activeService;document.querySelector('#contato').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});document.querySelector('#contact-name').focus({preventScroll:true});});
 const scroller=document.querySelector('.reviews-scroller'),track=scroller.querySelector('.review-track'),cards=[...track.children],dots=[...document.querySelectorAll('[data-review-go]')];
 const reviewSection=scroller.closest('.al-reviews');
 let current=0,firstIndex=0,step=0,duration=0,dotTimer=0,scrollFrame=0,inView=false;
 function markDots(){dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===current)));}
 function populateReviews(){
  const ordered=[...cards.slice(firstIndex),...cards.slice(0,firstIndex)];
  const copies=ordered.map(card=>{const copy=card.cloneNode(true);copy.dataset.reviewClone='';copy.setAttribute('aria-hidden','true');return copy;});
  track.replaceChildren(...ordered,...copies);
 }
 function resizeReviews(){
  const nextStep=cards[0].offsetWidth+parseFloat(getComputedStyle(track).columnGap);
  if(!nextStep||nextStep===step)return;
  const animation=track.getAnimations()[0],phase=duration&&animation?Number(animation.currentTime||0)/duration:0;
  step=nextStep;duration=step*cards.length/28*1000;
  track.style.setProperty('--review-loop-distance',step*cards.length+'px');
  track.style.setProperty('--review-loop-duration',duration+'ms');
  track.classList.add('is-looping');
  const updated=track.getAnimations()[0];if(updated)updated.currentTime=phase*duration;
 }
 function updateDots(){
  clearTimeout(dotTimer);
  if(!inView||document.hidden||reduced.matches)return;
  const animation=track.getAnimations()[0];
  if(animation&&duration){const progress=((Number(animation.currentTime||0)%duration)+duration)%duration;const index=(firstIndex+Math.floor(progress/duration*cards.length))%cards.length;if(current!==index){current=index;markDots();}}
  dotTimer=setTimeout(updateDots,600);
 }
 function updateLoop(){
  scroller.toggleAttribute('data-review-paused',!inView||document.hidden);
  updateDots();
 }
 function showReview(index){current=firstIndex=(index+cards.length)%cards.length;populateReviews();scroller.scrollTo({left:0,behavior:'instant'});const animation=track.getAnimations()[0];if(animation)animation.currentTime=0;markDots();}
 populateReviews();new ResizeObserver(resizeReviews).observe(scroller);resizeReviews();
 if('IntersectionObserver'in window){const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;updateLoop();});visibility.observe(reviewSection);}else{inView=true;updateLoop();}
 document.addEventListener('visibilitychange',updateLoop);
 reduced.addEventListener('change',()=>{resizeReviews();updateLoop();});
 window.addEventListener('pagehide',()=>{clearTimeout(dotTimer);scroller.setAttribute('data-review-paused','');});
 window.addEventListener('pageshow',updateLoop);
 document.querySelector('[data-review-prev]').addEventListener('click',()=>showReview(current-1));
 document.querySelector('[data-review-next]').addEventListener('click',()=>showReview(current+1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>showReview(i)));
 scroller.addEventListener('scroll',()=>{if(!reduced.matches||scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;const card=track.children[Math.round(scroller.scrollLeft/step)];if(card){current=Number(card.dataset.reviewIndex);markDots();}});},{passive:true});
 scroller.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();showReview(current+(event.key==='ArrowRight'?1:-1));}});
 let swipeStart=null;
 scroller.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!reduced.matches)swipeStart=event.clientX;},{passive:true});
 scroller.addEventListener('pointerup',event=>{if(swipeStart===null)return;const delta=event.clientX-swipeStart;swipeStart=null;if(Math.abs(delta)>40)showReview(current+(delta<0?1:-1));},{passive:true});
 scroller.addEventListener('pointercancel',()=>{swipeStart=null;},{passive:true});
})();
