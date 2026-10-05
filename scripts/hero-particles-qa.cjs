const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const context=await browser.newContext();
  await context.route('https://www.clarity.ms/**',r=>r.abort());
  await context.addInitScript(()=>{
   sessionStorage.setItem('portfolio-chibi-hidden','true');
   window.particleDraws=0;window.smokeDraws=0;window.beforeOpeningDraws=0;window.particleStarts=[];
   window.sparkTracks=new Map();window.travelled=[];window.paths=[];window.frameNumber=0;
   const clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){
    if(this.canvas.classList.contains('hero-particles')){
     for(const [key,p] of window.sparkTracks){
      if(p.frame<window.frameNumber){window.travelled.push(Math.hypot(p.x-p.startX,p.y-p.startY));window.paths.push(p);window.sparkTracks.delete(key);}
     }
     window.frameNumber++;
    }
    return clear.apply(this,args);
   };
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){
    if(this.canvas.classList.contains('hero-particles')){
     window.particleDraws++;
     if(document.querySelector('.hero-sequence').dataset.motionState!=='complete')window.beforeOpeningDraws++;
     if(args[0].width>32)window.smokeDraws++;
     else{
      const x=args[1]+args[3]/2,y=args[2]+args[4]/2,key=args[3];
      // Each spark has a unique continuous size, retained throughout its life.
      if(!window.sparkTracks.has(key)){
       window.sparkTracks.set(key,{startX:x,startY:y,history:[]});
       if(window.particleStarts.length<100)window.particleStarts.push({x,y,frame:window.frameNumber});
      }
      Object.assign(window.sparkTracks.get(key),{x,y,frame:window.frameNumber});
      window.sparkTracks.get(key).history.push({x,y});
     }
    }
    return draw.apply(this,args);
   };
  });
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const snapshot=()=>page.locator('.hero-particles').evaluate(c=>{
   const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let visible=0,red=0,hash=0;for(let i=0;i<p.length;i+=4){if(p[i+3]>8){visible++;if(p[i]>p[i+1]*1.1&&p[i]>p[i+2]*1.1)red++;}hash=(hash*31+p[i]+p[i+3])|0;}
   return {visible,red,hash};
  });
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4173',{waitUntil:'domcontentloaded'});
   await page.locator('.hero-sequence').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>['running','complete'].includes(document.querySelector('.hero-sequence').dataset.motionState));
   if(await page.locator('.hero-sequence').getAttribute('data-motion-state')==='running')assert.equal(await page.locator('.hero-particles').getAttribute('data-count'),'0','No particles during the opening');
   await page.waitForFunction(()=>document.querySelector('.hero-particles').dataset.state==='running');
   assert.equal(await page.locator('.hero-sequence').getAttribute('data-motion-state'),'complete');
   assert.equal(await page.evaluate(()=>window.beforeOpeningDraws),0,'Particles start only after the opening completes');
   await page.waitForFunction(()=>Number(document.querySelector('.hero-particles').dataset.count)>=1);
   await page.waitForFunction(()=>{
    const image=document.querySelector('.hero-portrait-main').getBoundingClientRect(),layer=document.querySelector('.hero-particles').getBoundingClientRect();
    const u=p=>(p.x-(image.left-layer.left))/image.width;
    return window.particleStarts.length>=12&&window.particleStarts.filter(p=>u(p)<.5).length>=2&&window.particleStarts.filter(p=>u(p)>.6&&u(p)<1).length>=2
     &&window.paths.some(p=>p.startX>image.right-layer.left&&p.startX-p.x>image.width*.48);
   },null,{timeout:90000});
   const anchor=await page.evaluate(()=>{
    const photo=document.querySelector('.hero-portrait-main'),layer=document.querySelector('.hero-particles');
    const image=photo.getBoundingClientRect(),box=layer.getBoundingClientRect();
    const sample=document.createElement('canvas');sample.width=photo.naturalWidth;sample.height=photo.naturalHeight;
    const paint=sample.getContext('2d');paint.drawImage(photo,0,0);const pixels=paint.getImageData(0,0,sample.width,sample.height).data;
    const startX=p=>(p.x-(image.left-box.left))/image.width;
    const rimStarts=window.particleStarts.filter(p=>startX(p)<1);
    const matches=rimStarts.filter(point=>{
     const x=Math.round((point.x-(image.left-box.left))/image.width*sample.width),y=Math.round((point.y-(image.top-box.top))/image.height*sample.height);
     if(x<0||x>=sample.width||y<0||y>sample.height*.95)return false;
     for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
      const sx=x+dx,sy=y+dy;if(sx<0||sy<0||sx>=sample.width||sy>=sample.height)continue;
      const i=(sy*sample.width+sx)*4;if(pixels[i]>60&&pixels[i]>pixels[i+1]*1.6&&pixels[i+3]>70)return true;
     }
     return false;
    }).length;
    const left=rimStarts.filter(p=>startX(p)<.5).length;
    const right=rimStarts.filter(p=>startX(p)>.6).length;
    const background=window.particleStarts.filter(p=>startX(p)>1).length;
    const longBackground=window.paths.filter(p=>p.startX>image.right-box.left&&p.startX-p.x>image.width*.48).length;
    const foreground=window.paths.filter(p=>{
     const origin=(p.startX-(image.left-box.left))/image.width;
     return origin>.6&&p.history.some(position=>{
      const u=(position.x-(image.left-box.left))/image.width,v=(position.y-(image.top-box.top))/image.height;
      if(u>=origin-.025||u<0||u>=1||v<0||v>=1)return false;
      return pixels[(Math.floor(v*sample.height)*sample.width+Math.floor(u*sample.width))*4+3]>230;
     });
    }).length;
    const portrait=document.querySelector('.hero-portrait');
    const abovePhoto=Number(getComputedStyle(layer).zIndex)>=Number(getComputedStyle(portrait).zIndex)&&Boolean(portrait.compareDocumentPosition(layer)&Node.DOCUMENT_POSITION_FOLLOWING);
    return {matches,total:rimStarts.length,left,right,background,longBackground,foreground,abovePhoto,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(anchor.total>=4);assert.ok(anchor.matches/anchor.total>.85,JSON.stringify(anchor));assert.equal(anchor.overflow,false);
   assert.ok(anchor.left>=2&&anchor.right>=2,'Both red rims emit isolated sparks');
   assert.ok(anchor.foreground>=1&&anchor.abovePhoto,JSON.stringify(anchor));
   assert.ok(anchor.background>=1&&anchor.longBackground>=1,'Occasional background sparks cross a much longer distance from the right');
   const variation=await page.evaluate(()=>{
    const gaps=window.particleStarts.slice(1).map((p,i)=>p.frame-window.particleStarts[i].frame);
    return {shortest:Math.min(...window.travelled),longest:Math.max(...window.travelled),single:gaps.every(n=>n>0),differentGaps:new Set(gaps).size};
   });
   assert.ok(variation.longest/variation.shortest>2.5,'Sparks disappear at visibly different distances');
   assert.ok(variation.single&&variation.differentGaps>=3,'Births occur one at a time with varied intervals');
   const a=await snapshot();await page.waitForTimeout(160);const b=await snapshot();assert.ok(a.visible+b.visible>0);assert.notEqual(a.hash,b.hash,'Particles actually move');
   assert.ok((a.red+b.red)/(a.visible+b.visible)>.98,'All visible sparks remain red');
   assert.equal(await page.evaluate(()=>window.smokeDraws),0,'No smoke layer is rendered');
   assert.ok(Number(await page.locator('.hero-particles').getAttribute('data-count'))<=4,'At most four sparks coexist on desktop and mobile');
   assert.equal(await page.locator('.hero-particles').getAttribute('aria-hidden'),'true');
   assert.equal(await page.locator('.hero-particles').evaluate(c=>getComputedStyle(c).pointerEvents),'none');
   await page.evaluate(()=>window.savedParticleLayer=document.querySelector('.hero-particles'));
   await page.locator('[data-language="en"]').evaluate(b=>b.click());
   assert.ok(await page.evaluate(()=>window.savedParticleLayer===document.querySelector('.hero-particles')));
   assert.equal(await page.locator('.hero-particles').getAttribute('data-state'),'running');
   await page.locator('[data-language="pt"]').evaluate(b=>b.click());
   await page.waitForFunction(()=>Number(document.querySelector('.hero-particles').dataset.count)>=1);
   await page.locator('.hero-sequence').screenshot({path:`.qa/hero-particles-${width}.png`});
   await page.screenshot({path:`.qa/hero-particles-page-${width}.png`});
   await page.locator('#contato').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.hero-particles').dataset.state==='paused');
   const stopped=await page.evaluate(()=>window.particleDraws);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.particleDraws),stopped);
   await page.locator('.hero-sequence').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.hero-particles').dataset.state==='running');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.querySelector('.hero-particles').dataset.state==='disabled');
   assert.equal(await page.locator('.hero-particles').getAttribute('data-count'),'0');
   assert.equal(await page.locator('.hero-particles').evaluate(c=>getComputedStyle(c).display),'none');
   await page.emulateMedia({reducedMotion:'no-preference'});
   console.log(`PASS ${width}px: delayed start, both red rims, up to 4 subtle sparks, long paths from right background, foreground motion, PT/ENG continuity, offscreen pause and reduced motion`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
