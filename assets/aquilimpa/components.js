(() => {
 'use strict';
 const copy={pt:{invalid:'Informe um e-mail válido para continuar.',valid:'Campo validado. Este exemplo não envia nem armazena dados.',action:'Ação demonstrada. O estilo e o foco são os mesmos da página.',card:'Este cartão reúne o ícone, o serviço, os itens incluídos e a ação de detalhes.'},en:{invalid:'Enter a valid email to continue.',valid:'Field validated. This example does not send or store data.',action:'Action demonstrated. The style and focus match the page.',card:'This card brings together the icon, service, included items and detail action.'},es:{invalid:'Introduce un correo válido para continuar.',valid:'Campo validado. Este ejemplo no envía ni almacena datos.',action:'Acción demostrada. El estilo y el foco coinciden con la página.',card:'Esta tarjeta reúne el icono, el servicio, los elementos incluidos y la acción de detalles.'}};
 const text=key=>(copy[document.documentElement.lang]||copy.pt)[key];
 const form=document.querySelector('.ds-demo-form'),email=document.querySelector('#ds-email'),feedback=document.querySelector('.ds-feedback');let result='';
 form.addEventListener('submit',event=>{event.preventDefault();result=email.validity.valid?'valid':'invalid';email.setAttribute('aria-invalid',String(result==='invalid'));feedback.dataset.valid=String(result==='valid');feedback.hidden=false;feedback.textContent=text(result);if(result==='invalid')email.focus();});
 email.addEventListener('input',()=>{if(result==='invalid'){email.removeAttribute('aria-invalid');feedback.hidden=true;result='';}});
 document.querySelectorAll('[data-preview-action]').forEach(button=>button.addEventListener('click',()=>document.querySelector('.ds-action-status').textContent=text('action')));
 document.querySelector('[data-preview-card]').addEventListener('click',()=>{const status=document.querySelector('.ds-card-status');status.hidden=false;status.textContent=text('card');});
 document.addEventListener('portfolio:language',()=>{if(result)feedback.textContent=text(result);if(document.querySelector('.ds-action-status').textContent)document.querySelector('.ds-action-status').textContent=text('action');if(!document.querySelector('.ds-card-status').hidden)document.querySelector('.ds-card-status').textContent=text('card');});
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='aqui-ds-language')return;document.dispatchEvent(new CustomEvent('portfolio:set-language',{detail:{language:event.data.language}}));});
 let frame=0;
 function reportHeight(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;parent.postMessage({type:'aqui-ds-height',height:Math.ceil(document.querySelector('.ds-specimens').getBoundingClientRect().height+16)},location.origin);});}
 new ResizeObserver(reportHeight).observe(document.querySelector('.ds-specimens'));window.addEventListener('load',reportHeight);document.fonts.ready.then(reportHeight);reportHeight();
})();
