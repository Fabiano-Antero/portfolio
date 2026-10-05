import {createCharacterChat} from './chibi-chat.js?v=20261005-perf';

let dismissed=false;
try{dismissed=sessionStorage.getItem('portfolio-chibi-hidden')==='true';}catch{}
if(!dismissed) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const layer=document.createElement('div');layer.className='chibi-layer';
  const preview=document.createElement('div');preview.className='chibi-pet chibi-placeholder';preview.dataset.state='idle';
  const image=document.createElement('img');image.src=new URL('../img/chibi-preview.webp',import.meta.url).href;
  image.alt='';image.width=240;image.height=260;image.setAttribute('aria-hidden','true');
  const trigger=document.createElement('button');trigger.className='chibi-trigger';trigger.type='button';
  const close=document.createElement('button');close.className='chibi-close';close.type='button';close.textContent='×';
  preview.append(image,trigger,close);layer.append(preview);document.body.append(layer);
  let alive=true, loading, pet, queued=false, idleTask, observer;
  const chat=createCharacterChat(layer,{onOpen:()=>{preview.dataset.chatOpen='true';loadPet();},onClose:()=>{delete preview.dataset.chatOpen;}});
  const language=()=>{
    const english=document.documentElement.lang==='en';
    trigger.setAttribute('aria-label',english?'Play with the 3D character':'Brincar com o personagem 3D');
    close.setAttribute('aria-label',english?'Hide character':'Ocultar personagem');
  };
  language();document.addEventListener('portfolio:language',language);
  const removePreview=()=>{preview.remove();document.removeEventListener('portfolio:language',language);};
  async function loadPet(event) {
    if(!alive||reduced.matches)return;
    if(!loading)loading=(async()=>{
      const {createPet}=await import('./chibi-pet.js?v=20261005-perf');
      if(!alive)return;
      pet=await createPet({layer,chat,onReady:removePreview});
      if(!alive)pet?.destroy();
      return pet;
    })().catch(error=>{console.warn('Character unavailable:',error.message);});
    const character=await loading;
    if(event&&alive&&!chat.isOpen&&document.hasFocus())character?.attach(event);
  }
  trigger.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')loadPet(event);});
  trigger.addEventListener('pointerdown',event=>{if(event.button===0)loadPet(event);});
  trigger.addEventListener('click',event=>{if(event.detail===0)loadPet({pointerType:'mouse'});});
  close.addEventListener('click',()=>{
    alive=false;try{sessionStorage.setItem('portfolio-chibi-hidden','true');}catch{}
    observer?.disconnect();if(idleTask)window.cancelIdleCallback?.(idleTask);
    document.removeEventListener('portfolio:language',language);chat.destroy();layer.remove();
  });
  const queue=()=>{
    if(queued||!alive||reduced.matches||document.hidden)return;
    const art=document.querySelector('.hero-sequence'),copy=document.querySelector('.hero-copy');
    if(art&&(art.dataset.motionState!=='complete'||copy?.classList.contains('is-copy-animating')))return;
    queued=true;observer?.disconnect();
    if('requestIdleCallback' in window)idleTask=requestIdleCallback(()=>loadPet(),{timeout:2000});
    else setTimeout(()=>loadPet(),200);
  };
  observer=new MutationObserver(queue);
  for(const element of document.querySelectorAll('.hero-sequence,.hero-copy'))observer.observe(element,{attributes:true,attributeFilter:['data-motion-state','class']});
  if(document.readyState==='complete')queue();else window.addEventListener('load',queue,{once:true});
  document.addEventListener('visibilitychange',queue);reduced.addEventListener('change',queue);
}
