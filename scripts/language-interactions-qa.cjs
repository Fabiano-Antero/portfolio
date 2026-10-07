const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4177';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('https://www.clarity.ms/**',r=>r.abort());
  await page.goto(base);await page.locator('.chibi-chat-launcher').waitFor();
  await page.locator('#tab-decisao').click();await page.locator('[data-language=es]').click();
  assert.equal(await page.locator('#tab-decisao').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#tab-decisao').innerText(),'Decisión');assert(await page.locator('#panel-decisao').isVisible());
  await page.locator('.chibi-chat-launcher').click();
  const panel=page.locator('.chibi-chat-panel'),input=panel.locator('input');
  assert.equal(await panel.locator('h2').innerText(),'Conversa con Fabiano');
  assert.match(await panel.locator('.chibi-chat-answer').first().innerText(),/¡Puedes preguntar!/);
  await input.fill('¿Qué hiciste en Dadoteca?');await input.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.chibi-chat-form').getAttribute('aria-busy')==='false');
  assert.match(await panel.locator('.chibi-chat-answer').last().innerText(),/2025 a 2026/);
  await input.fill('Cuéntame sobre Ordiny');await input.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.chibi-chat-form').getAttribute('aria-busy')==='false');
  assert(await panel.getByRole('link',{name:'Conocer Ordiny',exact:true}).isVisible());
  const count=await panel.locator('.chibi-chat-bubble').count();
  const visitor=await panel.locator('.chibi-chat-visitor p').allTextContents();
  await input.fill('Mi próxima pregunta');
  for(const locale of ['en','pt','es']){
   await page.locator(`[data-language=${locale}]`).click();
   assert.equal(await input.inputValue(),'Mi próxima pregunta');
   assert.equal(await panel.locator('.chibi-chat-bubble').count(),count);
   assert.deepEqual(await panel.locator('.chibi-chat-visitor p').allTextContents(),visitor);
   assert(await panel.isVisible(),'Locale preserves the open conversation');
  }
  await input.fill('No tengo más preguntas');await input.press('Enter');assert(await panel.isHidden());
  assert.equal(await page.locator('.chibi-chat-launcher').getAttribute('aria-expanded'),'false');
  await page.goto(base+'/ordiny.html');assert.equal(await page.locator('html').getAttribute('lang'),'es');
  const control=page.locator('.comparison-control');
  await control.evaluate(node=>{node.value='42';node.dispatchEvent(new Event('input',{bubbles:true}));});
  for(const locale of ['en','pt','es']){
   await page.locator(`[data-language=${locale}]`).click();assert.equal(await control.inputValue(),'42');
  }
  assert.equal(await control.getAttribute('aria-valuetext'),'Tema claro: 42%. Tema oscuro: 58%.');
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});await page.goto(base);
   await page.locator('.site-header').screenshot({path:`.qa/spanish-navbar-${width}.png`});
   await page.locator('.chibi-chat-launcher').click();
   const box=await panel.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=1000);
   await panel.screenshot({path:`.qa/spanish-chat-${width}.png`});
  }
  await page.close();
  const motion=await browser.newPage({viewport:{width:1440,height:1000}});
  motion.on('pageerror',error=>errors.push(error.message));await motion.route('https://www.clarity.ms/**',r=>r.abort());
  await motion.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
  await motion.goto(base);await motion.waitForFunction(()=>document.querySelector('.hero-sequence')?.dataset.motionState==='running');
  await motion.evaluate(()=>{
   const title=document.querySelector('.hero-copy h1');
   for(const animation of title.getAnimations({subtree:true})){animation.pause();animation.currentTime=900;}
   window.qaPhotoAnimations=document.querySelector('.hero-sequence').getAnimations({subtree:true});
   window.qaFollowAnimations=[...document.querySelectorAll('.hero-follow')].flatMap(node=>node.getAnimations());
  });
  await motion.locator('[data-language=es]').click();
  await motion.waitForFunction(()=>[...document.querySelectorAll('.hero-writing')].every(node=>!node.classList.contains('is-writing-preparing')));
  const preserved=await motion.evaluate(()=>({
   times:document.querySelector('.hero-copy h1').getAnimations({subtree:true}).map(a=>({time:a.currentTime,state:a.playState})),
   photo:window.qaPhotoAnimations.every(a=>document.querySelector('.hero-sequence').getAnimations({subtree:true}).includes(a)),
   following:window.qaFollowAnimations.every(a=>[...document.querySelectorAll('.hero-follow')].flatMap(node=>node.getAnimations()).includes(a)),
   labels:[...document.querySelectorAll('.hero-writing-label')].map(node=>node.textContent.trim()),
   paths:[...document.querySelectorAll('.hero-writing')].every(node=>JSON.stringify([...node.querySelectorAll('.hero-letter')].map(path=>path.getAttribute('d')))===JSON.stringify(window.heroLettering[node.querySelector('.hero-writing-label').textContent.trim()].paths))
  }));
  assert(preserved.times.length>0);assert(preserved.times.every(a=>a.time===900&&a.state==='paused'),'Translated letters retain reveal progress');
  assert(preserved.photo&&preserved.following,'Photo and supporting animation instances persist');assert(preserved.paths,'Spanish uses the same typeface outlines');
  assert.deepEqual(preserved.labels,['DE LA LÓGICA','AL PRODUCTO','EN USO.']);
  await motion.evaluate(()=>{for(const a of document.querySelector('.hero-copy h1').getAnimations({subtree:true})){a.finish();}});
  await motion.locator('[data-language=en]').click();
  await motion.waitForFunction(()=>[...document.querySelectorAll('.hero-writing')].every(node=>!node.classList.contains('is-writing-preparing')));
  assert(await motion.evaluate(()=>document.querySelector('.hero-copy h1').getAnimations({subtree:true}).every(a=>a.currentTime>=a.effect.getComputedTiming().endTime)),'A completed reveal stays complete');
  await motion.close();assert.deepEqual(errors,[]);
  fs.writeFileSync('.qa/language-interactions-report.json',JSON.stringify({chat:true,comparator:true,tabs:true,animation:preserved,errors},null,2));
  console.log('Passed: Spanish conversation, translated links, history and input continuity, ending, mobile cards, tabs, comparator, hero animation progress and completed reveal.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
