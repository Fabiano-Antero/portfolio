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
 let current=0,scrollFrame=0;
 function markDots(){dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===current)));}
 function showReview(index){current=(index+cards.length)%cards.length;track.replaceChildren(...cards.slice(current),...cards.slice(0,current));scroller.scrollTo({left:0,behavior:'instant'});markDots();}
 document.querySelector('[data-review-prev]').addEventListener('click',()=>showReview(current-1));
 document.querySelector('[data-review-next]').addEventListener('click',()=>showReview(current+1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>showReview(i)));
 scroller.addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;const gap=24,width=track.firstElementChild.getBoundingClientRect().width+gap,index=Math.round(scroller.scrollLeft/width);const card=track.children[index];if(card){current=Number(card.dataset.reviewIndex);markDots();}});},{passive:true});
 scroller.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();showReview(current+(event.key==='ArrowRight'?1:-1));}});
})();
