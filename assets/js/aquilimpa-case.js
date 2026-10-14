(() => {
 'use strict';
 const components=document.querySelector('[data-component-frame]');
 const previews=[...document.querySelectorAll('[data-page-preview]')];
 const locale=()=>document.documentElement.lang==='pt-BR'?'pt':document.documentElement.lang;
 function syncLanguage(){components.contentWindow?.postMessage({type:'aqui-ds-language',language:locale()},location.origin);}
 components.addEventListener('load',syncLanguage);document.addEventListener('portfolio:language',syncLanguage);
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==components.contentWindow||event.data?.type!=='aqui-ds-height')return;const height=Number(event.data.height);if(Number.isFinite(height)&&height>=200&&height<5000)components.style.height=height+'px';});
 const resize=()=>previews.forEach(preview=>preview.style.setProperty('--preview-scale',preview.clientWidth/1512));
 const observer=new ResizeObserver(resize);previews.forEach(preview=>observer.observe(preview));resize();
 const statuses={pt:{success:'Cor copiada:',failure:'Copie o código da cor:'},en:{success:'Color copied:',failure:'Copy the color code:'},es:{success:'Color copiado:',failure:'Copia el código del color:'}};
 document.querySelectorAll('[data-copy-color]').forEach(button=>button.addEventListener('click',async()=>{const value=button.dataset.copyColor;let success=false;try{await navigator.clipboard.writeText(value);success=true;}catch{}document.querySelector('.aqui-copy-status').textContent=(statuses[locale()]||statuses.pt)[success?'success':'failure']+' '+value;}));
})();
