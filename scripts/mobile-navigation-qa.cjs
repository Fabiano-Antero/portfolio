const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4177';
const files=['index.html','projetos.html','ordiny.html','cash-advance.html','sandfit.html'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const results=[];
  for(const width of [320,390,767,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://www.clarity.ms/**',route=>route.abort());
   await page.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
   for(const file of files){
    await page.goto(base+'/'+file,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>document.fonts.ready);
    const toggle=page.locator('[data-mobile-menu-toggle]'),select=page.locator('[data-mobile-language]'),panel=page.locator('#mobile-navigation');
    const choose=async locale=>{await select.click();await page.locator(`[data-mobile-language-option="${locale}"]`).click();};
    assert.equal(await toggle.isVisible(),width<768);
    assert.equal(await select.isVisible(),width<768);
    assert.equal(await panel.isVisible(),false);
    assert.equal(await page.locator('.language').isVisible(),width>=768);
    if(width<768){
     const layout=await page.evaluate(()=>{
      const elements=['.brand','[data-mobile-language]','[data-mobile-menu-toggle]'].map(selector=>document.querySelector('.site-header '+selector).getBoundingClientRect());
      return {centers:elements.map(rect=>rect.y+rect.height/2),overlap:elements.some((rect,i)=>i&&elements[i-1].right>rect.left),overflow:document.documentElement.scrollWidth>innerWidth,toggle:getComputedStyle(document.querySelector('[data-mobile-menu-toggle]')).backgroundColor,select:getComputedStyle(document.querySelector('[data-mobile-language]')).backgroundColor};
     });
     assert(Math.max(...layout.centers)-Math.min(...layout.centers)<1,'Name and controls share one row');
     assert(!layout.overlap&&!layout.overflow,`${file} at ${width} fits`);
     assert.equal(layout.toggle,'rgba(0, 0, 0, 0)');assert.equal(layout.select,'rgb(16, 17, 20)');
     const dropdown=await select.evaluate(element=>({height:element.getBoundingClientRect().height,border:getComputedStyle(element).borderWidth,gap:getComputedStyle(element).gap,outline:getComputedStyle(element).outlineStyle}));
     assert.equal(dropdown.height,30);assert.equal(dropdown.border,'0px');assert.equal(dropdown.gap,'4px');assert.equal(dropdown.outline,'none');
     await toggle.click();assert.equal(await panel.isVisible(),true);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
     assert.equal(await panel.evaluate(element=>getComputedStyle(element).backgroundColor),'rgba(0, 0, 0, 0)');
     assert.equal(await panel.locator('a:visible').count(),await page.locator('.desktop-nav a,.case-navigation a').count());
     for(const [locale,lang,label] of [['es','es','Cerrar menú'],['en','en','Close menu'],['pt','pt-BR','Fechar menu']]){
      await choose(locale);assert.equal(await page.locator('html').getAttribute('lang'),lang);
      assert.equal(await toggle.getAttribute('aria-label'),label);assert.equal(await panel.isVisible(),true);
     }
     if(file==='index.html'&&(width===320||width===390)){
      await page.locator('.site-header').screenshot({path:`.qa/mobile-header-open-${width}.png`});
     }
     await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);assert.equal(await toggle.evaluate(element=>element===document.activeElement),true);
     await toggle.click();await page.locator('main').click({position:{x:5,y:5}});assert.equal(await panel.isVisible(),false);
     await choose('es');await page.reload({waitUntil:'domcontentloaded'});
     assert.equal(await select.innerText(),'ESP');assert.equal(await toggle.getAttribute('aria-label'),'Abrir menú');
     await choose('pt');
     if(file==='index.html'){
      if(width===390){
       await page.screenshot({path:'.qa/mobile-header-closed-390.png'});
       await select.click();await page.locator('.site-header').screenshot({path:'.qa/mobile-language-options-390.png'});
       await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-mobile-language-option=pt]').evaluate(element=>element===document.activeElement),true);
       await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('html').getAttribute('lang'),'es');
       assert.equal(await page.locator('#mobile-language-options').isVisible(),false);await choose('pt');
      }
      await toggle.click();await panel.locator('a[href="#projetos"]').click();
      assert.equal(await panel.isVisible(),false);assert.equal(await page.locator('.project-transition').count(),0,'Home navbar skips curtain');
     }
    }else{
     assert.equal(await page.locator('.desktop-nav,.case-navigation').isVisible(),true);
     if(width===1440&&file==='index.html')await page.locator('.site-header').screenshot({path:'.qa/mobile-header-desktop-1440.png'});
    }
    results.push({width,file,passed:true});
   }
   assert.deepEqual(errors,[]);await page.close();console.log('Navbar passed at',width);
  }
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.goto(base+'/ordiny.html',{waitUntil:'domcontentloaded'});
  await page.locator('[data-mobile-menu-toggle]').click();await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.locator('#mobile-navigation').isVisible(),false);assert.equal(await page.locator('[data-mobile-menu-toggle]').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:390,height:900});await page.locator('[data-mobile-menu-toggle]').click();await page.locator('#mobile-navigation a').filter({hasText:'Home'}).click();
  await page.waitForURL(/\/(index\.html)?$/);await page.waitForLoadState('domcontentloaded');
  assert.equal(await page.locator('#mobile-navigation').isVisible(),false);await page.close();
  const motion=await browser.newPage({viewport:{width:390,height:900}});
  await motion.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
  await motion.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  await motion.locator('[data-mobile-menu-toggle]').click();
  const frames=await motion.locator('[data-mobile-menu-toggle] path').evaluateAll(bars=>{
   const merged=bars.map(bar=>{const animation=bar.getAnimations()[0];animation.pause();animation.currentTime=156;return getComputedStyle(bar).transform;});
   const crossed=bars.map(bar=>{bar.getAnimations()[0].currentTime=520;return getComputedStyle(bar).transform;});
   return {merged,crossed};
  });
  assert.notDeepEqual(frames.merged,frames.crossed,'Bars merge before turning into X');
  await motion.locator('[data-mobile-menu-toggle]').click();
  const returned=await motion.locator('[data-mobile-menu-toggle] path').evaluateAll(bars=>{
   for(const bar of bars){const animation=bar.getAnimations()[0];animation.pause();animation.currentTime=480;}
   const rebound=getComputedStyle(bars[1]).transform;
   for(const bar of bars){const animation=bar.getAnimations()[0];animation.currentTime=640;animation.finish();}
   return {rebound,opacity:getComputedStyle(bars[1]).opacity};
  });
  assert.notEqual(returned.rebound,'none');assert.equal(returned.opacity,'1');
  for(let index=0;index<6;index++)await motion.locator('[data-mobile-menu-toggle]').click();
  assert.equal(await motion.locator('[data-mobile-menu-toggle]').getAttribute('aria-expanded'),'false');
  await motion.emulateMedia({reducedMotion:'reduce'});await motion.locator('[data-mobile-menu-toggle]').click();
  assert.equal(await motion.locator('[data-mobile-menu-toggle] path').evaluateAll(bars=>bars.flatMap(bar=>bar.getAnimations()).length),0);
  await motion.close();
  const noJS=await browser.newPage({viewport:{width:390,height:900},javaScriptEnabled:false});
  await noJS.goto(base+'/index.html');assert.equal(await noJS.locator('#mobile-navigation').isVisible(),true);assert.equal(await noJS.locator('[data-mobile-menu-toggle]').isVisible(),false);await noJS.close();
  fs.writeFileSync('.qa/mobile-navigation-report.json',JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
