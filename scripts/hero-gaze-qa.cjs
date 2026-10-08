const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {PNG}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   sessionStorage.setItem('portfolio-chibi-hidden','true');window.gazeDraws=0;window.prematureGazeDraws=0;
   const draw=WebGLRenderingContext.prototype.drawArrays;
   WebGLRenderingContext.prototype.drawArrays=function(...args){
    if(this.canvas.classList.contains('hero-gaze')){
     window.gazeDraws++;if(document.querySelector('.hero-sequence').dataset.motionState!=='complete')window.prematureGazeDraws++;
    }
    return draw.apply(this,args);
   };
  });
  await page.route('https://www.clarity.ms/**',route=>route.abort());
  await page.goto(process.env.PORTFOLIO_URL||'http://localhost:4177',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.hero-sequence[data-motion-state="complete"]');
  await page.waitForSelector('.hero-portrait[data-gaze="active"]');
  const portrait=page.locator('.hero-portrait');
  const neutral=await portrait.screenshot({path:'.qa/hero-gaze-neutral.png'});
  await portrait.evaluate(node=>delete node.dataset.gaze);
  const original=await portrait.screenshot({path:'.qa/hero-gaze-original.png'});
  await portrait.evaluate(node=>node.dataset.gaze='active');
  await page.mouse.move(50,200);await page.waitForTimeout(750);
  const left=await portrait.screenshot({path:'.qa/hero-gaze-left.png'});
  await page.mouse.move(1430,800);await page.waitForTimeout(750);
  const right=await portrait.screenshot({path:'.qa/hero-gaze-right.png'});
  await page.screenshot({path:'.qa/hero-gaze-page.png'});
  const a=PNG.sync.read(original),b=PNG.sync.read(neutral),l=PNG.sync.read(left),r=PNG.sync.read(right);
  function difference(p,q,y1,y2){let sum=0,count=0;for(let y=Math.floor(p.height*y1);y<p.height*y2;y++)for(let x=Math.floor(p.width*.27);x<p.width*.78;x++)for(let c=0;c<3;c++){sum+=Math.abs(p.data[(y*p.width+x)*4+c]-q.data[(y*q.width+x)*4+c]);count++;}return sum/count;}
  console.log({neutral:difference(a,b,.05,.52),head:difference(l,r,.05,.52),body:difference(l,r,.72,.9),errors});
  assert(difference(a,b,.05,.52)<5,'Neutral image preserves the portrait');
  assert(difference(l,r,.05,.52)>3,'The head visibly follows the pointer');
  assert(difference(l,r,.72,.9)<1,'The body stays stable');
  assert.equal(await page.locator('.hero-particles').getAttribute('data-state'),'running','Photo tracking preserves the particle effect');
  assert.equal(await page.evaluate(()=>window.prematureGazeDraws),0,'Tracking begins after the portrait entrance');
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));await page.waitForTimeout(800);
  const rest=await portrait.screenshot({path:'.qa/hero-gaze-rest.png'});assert(difference(PNG.sync.read(rest),b,.05,.52)<1,'Pointer exit returns to neutral');
  const idleDraws=await page.evaluate(()=>window.gazeDraws);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.gazeDraws),idleDraws,'No rendering loop while resting');
  await page.locator('[data-language=es]').evaluate(button=>button.click());assert.equal(await portrait.getAttribute('data-gaze'),'active','Language switching preserves tracking');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.hero-portrait').dataset.gaze);assert.equal(await page.locator('.hero-portrait-main').evaluate(image=>getComputedStyle(image).opacity),'1');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForSelector('.hero-portrait[data-gaze="active"]');
  await page.locator('.hero-gaze').evaluate(canvas=>canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(()=>!document.querySelector('.hero-portrait').dataset.gaze);assert.equal(await page.locator('.hero-portrait-main').evaluate(image=>getComputedStyle(image).opacity),'1','Context loss restores the original photo');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await mobile.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
  await mobile.goto(process.env.PORTFOLIO_URL||'http://localhost:4177',{waitUntil:'domcontentloaded'});await mobile.locator('.hero-portrait').scrollIntoViewIfNeeded();await mobile.waitForSelector('.hero-sequence[data-motion-state="complete"]');
  assert.equal(await mobile.locator('.hero-gaze').count(),0,'Touch devices keep the original photo');await mobile.screenshot({path:'.qa/hero-gaze-mobile.png'});await mobile.close();
  assert.deepEqual(errors,[]);console.log('Head tracking, neutral pose, stable torso, idle rendering, language, reduced motion, context fallback and touch verified.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
