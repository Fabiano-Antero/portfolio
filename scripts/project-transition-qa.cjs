const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {PNG}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const base=process.env.PORTFOLIO_URL||'http://localhost:4177';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report=[];
 try{
  for(const [width,height] of (process.env.TRANSITION_QA_QUICK?[[320,568]]:[[1440,1000],[390,844],[320,568],[844,390]])){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://www.clarity.ms/**',r=>r.abort());
   await page.addInitScript(()=>{
    sessionStorage.setItem('portfolio-chibi-hidden','true');
    window.transitionPhases=[];
    const observer=new MutationObserver(records=>{
     for(const record of records){
      const root=document.querySelector('.project-transition');
      if(root&&window.transitionPhases.at(-1)!==root.dataset.phase)window.transitionPhases.push(root.dataset.phase);
     }
    });observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase']});
   });
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
   await page.locator('[data-language=es]').click();
   await page.locator('.desktop-nav a[href="#projetos"], .mobile-nav a[href="#projetos"]').filter({visible:true}).first().click();
   assert.equal(await page.locator('.project-transition').count(),0,'Home navbar goes directly to Projects');
   await page.evaluate(()=>history.replaceState(history.state,'',location.pathname));
   await page.locator('.hero .actions a[href="#projetos"]').click();
   await page.waitForSelector('.project-transition[data-phase=closing]');
   assert.equal(await page.evaluate(()=>document.body.inert),true,'Curtain blocks repeat interactions');
   assert.equal(await page.locator('.project-transition-band').count(),8);
   const colors=await page.locator('.project-transition-band').evaluateAll(nodes=>nodes.map(node=>({color:getComputedStyle(node).color,bg:getComputedStyle(node).backgroundColor,direction:getComputedStyle(node.firstElementChild).animationDirection})));
   assert(colors.every((color,i)=>color.bg===(i%2?'rgb(16, 17, 20)':'rgb(215, 255, 73)')&&color.direction===(i%2?'reverse':'normal')));
   await page.waitForSelector('.project-transition[data-phase=opening]');
   assert.equal(new URL(page.url()).hash,'#projetos');
   await page.waitForSelector('.project-transition',{state:'detached'});assert.equal(await page.evaluate(()=>document.body.inert),false);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'projetos');
   // Pause immediately before the closing completes, without blocking a network
   // request. Resume the same animations after checking the actual rendered frame.
   await page.locator('a[href="ordiny.html"]').first().evaluate(link=>{
    link.click();
    for(const band of document.querySelectorAll('.project-transition-band'))for(const animation of band.getAnimations()){
     animation.pause();animation.currentTime=animation.effect.getComputedTiming().endTime-.01;
    }
   });
   const offsets=await page.locator('.project-transition-band').evaluateAll(nodes=>nodes.map(node=>new DOMMatrix(getComputedStyle(node).transform).m41));
   assert.equal(offsets.length,8);assert(offsets.every(offset=>Math.abs(offset)<.1),'All bands close before navigation');
   const screenshot=await page.screenshot({path:`.qa/project-transition-covered-${width}.png`}),png=PNG.sync.read(screenshot);
   for(const [x,y] of [[1,1],[width-2,1],[1,height-2],[width-2,height-2]]){
    const offset=(y*png.width+x)*4,[r,g,b]=png.data.slice(offset,offset+3),mix=(r-16)/199;
    assert(mix>=-.02&&mix<=1.02&&Math.abs(g-(17+238*mix))<4&&Math.abs(b-(20+53*mix))<4,`Covered corner ${x},${y}: ${r},${g},${b}`);
   }
   await page.evaluate(()=>{for(const band of document.querySelectorAll('.project-transition-band'))for(const animation of band.getAnimations())animation.play();});
   await page.waitForURL('**/ordiny.html');await page.waitForSelector('.project-transition',{state:'detached'});
   assert.equal(await page.locator('html').getAttribute('lang'),'es');
   assert((await page.evaluate(()=>window.transitionPhases)).includes('covered'),'Destination is covered before revealing');
   assert.equal(await page.evaluate(()=>document.body.inert),false);
   const range=page.locator('.comparison-control');await range.evaluate(node=>{node.value=42;node.dispatchEvent(new Event('input'));});
   await page.locator('.chapter-link[href="#operacao"]').click();assert.equal(await page.locator('.project-transition').count(),0,'Chapter controls stay immediate');
   assert.equal(await range.inputValue(),'42');
   await page.locator('.site-header a[href="projetos.html"]').click();await page.waitForURL('**/projetos.html');await page.waitForSelector('.project-transition',{state:'detached'});
   for(const file of ['cash-advance.html','sandfit.html']){
    await page.locator(`a[href="${file}"]`).first().click();await page.waitForURL('**/'+file);await page.waitForSelector('.project-transition',{state:'detached'});
    assert.equal(await page.locator('html').getAttribute('lang'),'es');
    await page.locator('.site-header a[href="projetos.html"]').click();await page.waitForURL('**/projetos.html');await page.waitForSelector('.project-transition',{state:'detached'});
   }
   await page.goBack();await page.waitForSelector('.project-transition',{state:'detached'});assert.equal(await page.evaluate(()=>document.body.inert),false,'Back restores normal controls');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);report.push({width,height,covered:true,anchor:true,cases:3,language:'es',errors});await page.close();
   console.log('Passed diagonal transition at',width,height);
  }
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
  await page.goto(base);await page.locator('.hero .actions a[href="#projetos"]').evaluate(link=>{
   link.click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  });
  assert.equal(await page.locator('.project-transition').count(),0);assert.equal(await page.evaluate(()=>document.body.inert),false);
  assert.equal(new URL(page.url()).hash,'','Escape cancels the pending navigation');
  await page.locator('.collection-cta a[href="projetos.html"]').click({modifiers:['Control']});assert.equal(await page.locator('.project-transition').count(),0,'Modified click keeps browser behavior');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.desktop-nav a[href="#projetos"]').click();assert.equal(await page.locator('.project-transition').count(),0);
  assert.equal(new URL(page.url()).hash,'#projetos');
  await page.locator('a[href="ordiny.html"]').first().click();await page.waitForURL('**/ordiny.html');assert.equal(await page.locator('.project-transition').count(),0,'Reduced motion navigates directly');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('Storage disabled');};});
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Storage disabled');};});
  await page.locator('.site-header a[href="projetos.html"]').click();await page.waitForURL('**/projetos.html');await page.waitForSelector('.project-transition',{state:'detached'});
  assert.equal(await page.evaluate(()=>document.body.inert),false,'Unavailable storage still allows navigation');
  await page.close();
  const extra=await browser.newPage({viewport:{width:1440,height:1000}}),extraErrors=[];
  extra.on('pageerror',error=>extraErrors.push(error.message));
  await extra.addInitScript(()=>{
   sessionStorage.setItem('portfolio-chibi-hidden','true');
   if(!sessionStorage.getItem('qa-invalid-checked')){
    sessionStorage.setItem('portfolio-project-transition',JSON.stringify({url:'https://[bad-url',created:Date.now()}));
    sessionStorage.setItem('qa-invalid-checked','true');
   }
  });
  await extra.goto(base+'/ordiny.html');assert.equal(await extra.locator('.project-transition').count(),0,'Corrupt pending state is ignored');
  await extra.evaluate(()=>{const link=document.createElement('a');link.href='index.html#projetos';document.body.append(link);link.click();});
  await extra.waitForURL('**/index.html#projetos');await extra.waitForSelector('.project-transition',{state:'detached'});
  assert.equal(await extra.evaluate(()=>document.activeElement.id),'projetos','An anchor on another page is revealed at its destination');
  await extra.locator('a[href="cash-advance.html"]').first().click();await extra.waitForSelector('.project-transition[data-phase=closing]');
  await extra.emulateMedia({reducedMotion:'reduce'});await extra.waitForURL('**/cash-advance.html');assert.equal(await extra.locator('.project-transition').count(),0,'Changing the motion preference still completes navigation');
  await extra.emulateMedia({reducedMotion:'no-preference'});
  await extra.locator('.site-header a[href="projetos.html"]').click();await extra.waitForURL('**/projetos.html');await extra.waitForSelector('.project-transition',{state:'detached'});
  await extra.context().route('https://www.behance.net/**',route=>route.fulfill({body:'External case destination',contentType:'text/html'}));
  const opened=extra.waitForEvent('popup');await extra.locator('a[href*="234488301"]').first().click();const popup=await opened;
  await popup.waitForLoadState('domcontentloaded');assert(popup.url().includes('behance.net'));await popup.close();
  assert.equal(await extra.locator('.project-transition').count(),0,'External cases retain their new tab');assert.deepEqual(extraErrors,[]);await extra.close();
  const plain=await browser.newPage({javaScriptEnabled:false});await plain.goto(base);await plain.locator('a[href="ordiny.html"]').first().click();await plain.waitForURL('**/ordiny.html');await plain.close();
  fs.writeFileSync('.qa/project-transition-report.json',JSON.stringify({report,escape:true,modifiedClick:true,reducedMotion:true,storageFallback:true,invalidPending:true,crossPageAnchor:true,externalTabs:true,noJavaScript:true},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
