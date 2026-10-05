const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const context=await browser.newContext();
  await context.route('https://www.clarity.ms/**',r=>r.abort());
  await context.addInitScript(()=>{
   sessionStorage.setItem('portfolio-chibi-hidden','true');
   window.particleDraws=0;window.particleStarts=[];
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){
    if(this.canvas.classList.contains('hero-particles')){
     window.particleDraws++;
     if(window.particleStarts.length<32)window.particleStarts.push({x:args[1]+args[3]/2,y:args[2]+args[4]/2});
    }
    return draw.apply(this,args);
   };
  });
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const snapshot=()=>page.locator('.hero-particles').evaluate(c=>{
   const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let visible=0,hash=0;for(let i=0;i<p.length;i+=4){if(p[i+3]>20)visible++;hash=(hash*31+p[i]+p[i+3])|0;}
   return {visible,hash};
  });
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4173',{waitUntil:'domcontentloaded'});
   await page.locator('.hero-sequence').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.hero-sequence').dataset.motionState==='running');
   assert.equal(await page.locator('.hero-particles').getAttribute('data-count'),'0','No particles during the opening');
   await page.waitForFunction(()=>document.querySelector('.hero-particles').dataset.state==='running');
   assert.equal(await page.locator('.hero-sequence').getAttribute('data-motion-state'),'complete');
   await page.waitForFunction(()=>Number(document.querySelector('.hero-particles').dataset.count)>30);
   const anchor=await page.evaluate(()=>{
    const photo=document.querySelector('.hero-portrait-main'),layer=document.querySelector('.hero-particles');
    const image=photo.getBoundingClientRect(),box=layer.getBoundingClientRect();
    const sample=document.createElement('canvas');sample.width=photo.naturalWidth;sample.height=photo.naturalHeight;
    const paint=sample.getContext('2d');paint.drawImage(photo,0,0);const pixels=paint.getImageData(0,0,sample.width,sample.height).data;
    const matches=window.particleStarts.filter(point=>{
     const x=Math.round((point.x-(image.left-box.left))/image.width*sample.width),y=Math.round((point.y-(image.top-box.top))/image.height*sample.height);
     for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
      const sx=x+dx,sy=y+dy;if(sx<0||sy<0||sx>=sample.width||sy>=sample.height)continue;
      const i=(sy*sample.width+sx)*4;if(pixels[i]>125&&pixels[i]>pixels[i+1]*1.6&&pixels[i+3]>70)return true;
     }
     return false;
    }).length;
    return {matches,total:window.particleStarts.length,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(anchor.total>=20);assert.ok(anchor.matches/anchor.total>.85,JSON.stringify(anchor));assert.equal(anchor.overflow,false);
   const a=await snapshot();await page.waitForTimeout(160);const b=await snapshot();assert.ok(b.visible>50);assert.notEqual(a.hash,b.hash,'Particles actually move');
   assert.equal(await page.locator('.hero-particles').getAttribute('aria-hidden'),'true');
   assert.equal(await page.locator('.hero-particles').evaluate(c=>getComputedStyle(c).pointerEvents),'none');
   await page.evaluate(()=>window.savedParticleLayer=document.querySelector('.hero-particles'));
   await page.locator('[data-language="en"]').evaluate(b=>b.click());
   assert.ok(await page.evaluate(()=>window.savedParticleLayer===document.querySelector('.hero-particles')));
   assert.equal(await page.locator('.hero-particles').getAttribute('data-state'),'running');
   assert.ok(Number(await page.locator('.hero-particles').getAttribute('data-count'))>20,'Language does not reset the particle flow');
   await page.locator('[data-language="pt"]').evaluate(b=>b.click());
   await page.waitForFunction(()=>Number(document.querySelector('.hero-particles').dataset.count)>(innerWidth<768?90:165));
   await page.locator('.hero-sequence').screenshot({path:`.qa/hero-particles-${width}.png`});
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
   console.log(`PASS ${width}px: delayed start, red-rim origins, visible motion, PT/ENG continuity, offscreen pause and reduced motion`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
