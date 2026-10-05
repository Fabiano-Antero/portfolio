const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const context=await browser.newContext();
  await context.route('https://www.clarity.ms/**',route=>route.abort());
  await context.addInitScript(()=>{sessionStorage.setItem('portfolio-chibi-hidden','true');localStorage.setItem('portfolio-language','pt');});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   await page.goto('http://localhost:4173',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>document.fonts.ready);
   const strip=page.locator('.skills-marquee');
   assert.equal(await strip.evaluate(el=>getComputedStyle(el.firstElementChild).animationPlayState),'paused','Offscreen strip pauses');
   await strip.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
   await page.waitForFunction(()=>document.querySelector('.skills-marquee').classList.contains('is-running'));
   const layout=await strip.evaluate(el=>{
    const track=el.firstElementChild,groups=track.children,style=getComputedStyle(groups[0]);
    return {height:el.getBoundingClientRect().height,bg:getComputedStyle(el).backgroundColor,color:style.color,
     weight:style.fontWeight,size:parseFloat(style.fontSize),fontLoaded:document.fonts.check('700 48px "IBM Plex Mono"'),
     previous:el.previousElementSibling.id,next:el.nextElementSibling.id,
     widths:[...groups].map(g=>g.getBoundingClientRect().width),duplicate:groups[1].getAttribute('aria-hidden'),
     overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(layout.height,width>=768?136:96);assert.equal(layout.bg,'rgb(215, 255, 73)');
   assert.equal(layout.color,'rgb(16, 17, 20)');assert.equal(layout.weight,'700');assert.ok(layout.fontLoaded);
   assert.ok(Math.abs(layout.size-(width>=768?48.80851:28))<.001);
   assert.equal(layout.previous,'projetos');assert.equal(layout.next,'como-penso');
   assert.ok(Math.abs(layout.widths[0]-layout.widths[1])<.001);assert.equal(layout.duplicate,'true');assert.equal(layout.overflow,false);
   const seam=await strip.evaluate(el=>{
    const track=el.firstElementChild,animation=track.getAnimations()[0];animation.pause();animation.currentTime=0;
    const start=track.children[0].getBoundingClientRect().left;
    animation.currentTime=75000-.001;
    const end=track.children[1].getBoundingClientRect().left;
    animation.currentTime=0;
    return {start,end};
   });
   assert.ok(Math.abs(seam.start-seam.end)<.1,'Loop repeats at the same pixel position');
   assert.ok(Math.abs(seam.start-24)<.1,'Figma left padding');
   await strip.screenshot({path:'.qa/skills-marquee-'+width+'.png'});
   await strip.evaluate(el=>el.firstElementChild.getAnimations()[0].play());
   await page.waitForTimeout(200);
   await page.evaluate(()=>{
    window.marqueeAnimation=document.querySelector('.skills-marquee-track').getAnimations()[0];
    window.marqueeTime=window.marqueeAnimation.currentTime;
    document.querySelector('[data-language="en"]').click();
   });
   await page.waitForTimeout(100);
   assert.deepEqual(await strip.evaluate(el=>({same:el.firstElementChild.getAnimations()[0]===window.marqueeAnimation,
    advanced:window.marqueeAnimation.currentTime>window.marqueeTime,label:el.getAttribute('aria-label')})),
    {same:true,advanced:true,label:'Areas of expertise'});
   await strip.hover();assert.equal(await strip.evaluate(el=>getComputedStyle(el.firstElementChild).animationPlayState),'paused');
   await page.mouse.move(0,0);await strip.focus();
   assert.equal(await strip.evaluate(el=>getComputedStyle(el.firstElementChild).animationPlayState),'paused');
   await strip.evaluate(el=>el.blur());
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForFunction(()=>!document.querySelector('.skills-marquee').classList.contains('is-running'));
   await page.emulateMedia({reducedMotion:'reduce'});await strip.scrollIntoViewIfNeeded();
   const reduced=await strip.evaluate(el=>({animation:getComputedStyle(el.firstElementChild).animationName,
    duplicate:getComputedStyle(el.firstElementChild.children[1]).display,
    fits:el.firstElementChild.children[0].getBoundingClientRect().right<=innerWidth,
    overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.deepEqual(reduced,{animation:'none',duplicate:'none',fits:true,overflow:false});
   await page.emulateMedia({reducedMotion:'no-preference'});
   console.log(width+'px: Figma styling, seamless loop, language continuity, pause and reduced motion verified.');
  }
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
