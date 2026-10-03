const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if(r.status()>=400 && r.url().startsWith('http://localhost:4173')) errors.push(r.url()); });
  await page.goto('http://localhost:4173');
  await page.waitForFunction(() => document.querySelector('.hero-sequence').dataset.motionState === 'running');
  const sample = async time => page.evaluate(time => {
   document.querySelectorAll('.hero-sequence, .hero-copy').forEach(root => root.getAnimations({subtree:true}).forEach(animation => {animation.pause();animation.currentTime=time;}));
   const style = selector => getComputedStyle(document.querySelector(selector));
   return {
    portrait:Number(style('.hero-portrait').opacity),
    angle:parseFloat(style('.hero-circle').getPropertyValue('--hero-ring-angle')),
    intro:Number(style('.hero-skills-intro').opacity),
    rows:[...document.querySelectorAll('.hero-skill-text')].map(el=>Number(getComputedStyle(el).opacity)),
    dividers:[...document.querySelectorAll('.hero-skill-divider')].map(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).a),
    letters:[...document.querySelectorAll('.hero-letter')].map(el=>parseFloat(getComputedStyle(el).strokeDashoffset)),
    titleLines:[...document.querySelectorAll('.hero-writing')].map(el=>({
     letters:[...el.querySelectorAll('.hero-letter')].map(path=>parseFloat(getComputedStyle(path).strokeDashoffset)),
     fill:el.querySelector('.hero-letter-fill') ? Number(getComputedStyle(el.querySelector('.hero-letter-fill')).opacity) : null
    })),
    mask:style('.hero-circle').maskImage,
    following:[...document.querySelectorAll('.hero-follow')].map(el=>Number(getComputedStyle(el).opacity))
   };
  }, time);
  const start=await sample(0);
  assert.equal(start.portrait,0);assert.equal(start.angle,0);assert(start.letters.every(x=>x===1));
  assert(start.mask.includes('from 180deg'));assert.equal(start.titleLines[0].fill,0);assert.equal(start.titleLines[2].fill,0);
  assert.equal(start.following.length,5);assert(start.following.every(x=>x===0));
  const middle=await sample(650);assert(middle.portrait>0&&middle.portrait<1);assert.equal(middle.angle,0);assert(middle.letters[0]<1&&middle.letters.at(-1)===1);
  assert(middle.titleLines[1].letters.every(x=>x===1));assert(middle.titleLines[2].letters.every(x=>x===1));
  await page.screenshot({path:'.qa/hero-writing-progress.png'});
  const circle=await sample(1650);assert.equal(circle.portrait,1);assert(circle.angle>0&&circle.angle<360);assert.equal(circle.intro,0);
  assert(circle.titleLines[0].letters.every(x=>x===0));assert.equal(circle.titleLines[0].fill,1);assert(circle.titleLines[1].letters.every(x=>x===0));
  const secondLine=await sample(1150);assert(secondLine.titleLines[1].letters.some(x=>x<1));assert(secondLine.titleLines[2].letters.every(x=>x===1));
  const beforeThird=await sample(1650);assert(beforeThird.titleLines[1].letters.every(x=>x===0));assert(beforeThird.titleLines[2].letters.every(x=>x===1));
  const thirdLine=await sample(1850);assert(thirdLine.titleLines[2].letters.some(x=>x<1));assert.equal(thirdLine.titleLines[2].fill,0);
  const line=await sample(2950);assert(line.dividers[0]>0&&line.dividers[0]<1);assert.equal(line.rows[0],0);
  const cascade=await sample(3800);assert.equal(cascade.rows[0],1);assert(cascade.rows[1]>0);assert.equal(cascade.rows[2],0);
  const beforeSupporting=await sample(2400);assert(beforeSupporting.letters.every(x=>x===0));assert.equal(beforeSupporting.titleLines[2].fill,1);assert(beforeSupporting.following.every(x=>x===0));
  for(const [index,time] of [2640,3140,3540,4040,4540].entries()){
   const result=await sample(time);
   assert(result.following.slice(0,index).every(x=>x===1));
   assert(result.following[index]>0&&result.following[index]<1);
   assert(result.following.slice(index+1).every(x=>x===0));
  }
  await sample(1250);
  await page.evaluate(() => {
   window.savedHeroAnimations = [...document.querySelectorAll('.hero-sequence, .hero-copy')].flatMap(root => root.getAnimations({subtree:true})).filter(animation => !animation.effect.target.closest('.hero-writing'));
  });
  await page.getByRole('button',{name:'ENG',exact:true}).click();
  const translatedProgress=await page.evaluate(() => ({
   times:[...document.querySelectorAll('.hero-writing')].flatMap(el=>el.getAnimations({subtree:true})).map(animation=>animation.currentTime),
   paused:[...document.querySelectorAll('.hero-writing')].flatMap(el=>el.getAnimations({subtree:true})).every(animation=>animation.playState==='paused'),
   sameLayers:window.savedHeroAnimations.every(animation=>animation.currentTime===1250 && animation.playState==='paused')
  }));
  assert(translatedProgress.times.length>0);assert(translatedProgress.times.every(time=>time===1250));assert(translatedProgress.paused);assert(translatedProgress.sameLayers);
  await page.getByRole('button',{name:'PT',exact:true}).click();
  const final=await sample(8000);assert.equal(final.angle,360);assert(final.rows.every(x=>x===1));assert(final.dividers.every(x=>x===1));assert(final.letters.every(x=>x===0));assert(final.following.every(x=>x===1));
  assert.equal(final.titleLines[0].fill,1);assert.equal(final.titleLines[2].fill,1);
  await page.screenshot({path:'.qa/hero-final-desktop.png'});
  await page.getByRole('button',{name:'ENG',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.deepEqual(await page.locator('.hero-writing-label').allInnerTexts(),['FROM LOGIC','TO PRODUCT','IN USE.']);
  assert.equal(await page.locator('.outline .hero-letter').count(),9);
  assert.equal(await page.locator('button[data-language="en"]').getAttribute('aria-pressed'),'true');
  const completedTranslation=await page.evaluate(() => ({
   letters:[...document.querySelectorAll('.hero-letter')].map(el=>parseFloat(getComputedStyle(el).strokeDashoffset)),
   following:[...document.querySelectorAll('.hero-follow')].map(el=>Number(getComputedStyle(el).opacity)),
   times:[...document.querySelectorAll('.hero-writing')].flatMap(el=>el.getAnimations({subtree:true})).map(animation=>animation.currentTime)
  }));
  assert(completedTranslation.letters.every(x=>x===0));assert(completedTranslation.following.every(x=>x===1));assert(completedTranslation.times.every(time=>time===8000));
  // Also exercise a naturally running timeline and a completed reveal, without
  // manually paused animations, to catch flashes or supporting-content replays.
  const live=await context.newPage();
  await live.goto('http://localhost:4173');
  await live.waitForFunction(() => document.querySelector('.accent .hero-letter-fill').getAnimations()[0]?.currentTime>700);
  const elapsed=await live.evaluate(() => {
   window.savedRing=document.querySelector('.hero-circle').getAnimations()[0];
   window.savedFollowers=[...document.querySelectorAll('.hero-follow')].flatMap(el=>el.getAnimations());
   return document.querySelector('.accent .hero-letter-fill').getAnimations()[0].currentTime;
  });
  await live.locator('[data-language="pt"]').click();
  const continued=await live.evaluate(() => ({
   time:document.querySelector('.accent .hero-letter-fill').getAnimations()[0].currentTime,
   ring:document.querySelector('.hero-circle').getAnimations()[0]===window.savedRing,
   followers:[...document.querySelectorAll('.hero-follow')].flatMap(el=>el.getAnimations()).every((animation,i)=>animation===window.savedFollowers[i])
  }));
  assert(continued.time>=elapsed && continued.time<elapsed+1000);assert(continued.ring);assert(continued.followers);
  await live.waitForFunction(() => !document.querySelector('.hero-copy').classList.contains('is-copy-animating'));
  await live.locator('[data-language="en"]').click();
  assert(await live.evaluate(() => [...document.querySelectorAll('.hero-follow')].every(el=>Number(getComputedStyle(el).opacity)===1 && el.getAnimations().length===0)));
  assert(await live.evaluate(() => [...document.querySelectorAll('.hero-letter')].every(el=>parseFloat(getComputedStyle(el).strokeDashoffset)===0)));
  await live.close();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.hero-letter').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  const unchanged = {};
  const layouts=[];
  const copy=()=>{
   const result=[];const walk=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
   while(walk.nextNode())if(!walk.currentNode.parentElement.closest('script,style,svg')){const value=walk.currentNode.textContent.trim();if(value)result.push(value)}
   return result;
  };
  for(const file of ['index','projetos','ordiny','cash-advance']){
   await page.goto(`http://localhost:4173/${file}.html`,{waitUntil:'networkidle'});
   assert.equal(await page.locator('html').getAttribute('lang'),'en');
   await page.locator('[data-language="pt"]').click();const portuguese=await page.evaluate(copy);
   await page.locator('[data-language="en"]').click();const english=await page.evaluate(copy);
   unchanged[file]=[...new Set(portuguese.filter((text,i)=>text===english[i]))];
   for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const language of ['en','pt']){
     await page.locator(`[data-language="${language}"]`).click();
     const switcher=await page.locator('.site-header .language').boundingBox();
     assert(switcher && switcher.x>=0 && switcher.x+switcher.width<=width && switcher.height>=44,`Visible navbar language control: ${file} ${width}`);
     const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,title:[...document.querySelectorAll('.hero-title>span')].map(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth})),svg:(()=>{const el=document.querySelector('.hero-writing-svg');if(!el)return null;const b=el.getBoundingClientRect();return {right:b.right,width:b.width}})()}));
     layouts.push({file,width,language,...result});assert(!result.overflow,`${file} ${width} ${language} overflow`);
     if(file==='index' && result.svg)assert(result.svg.right<=width,`Lettering outside viewport: ${width}`);
     if(file==='index' && [390,320].includes(width))await page.screenshot({path:`.qa/hero-${width}-${language}.png`,fullPage:false});
    }
   }
   await page.locator('[data-language="en"]').click();
   if(file==='ordiny'){
    const control=page.locator('.comparison-control');await control.focus();await control.press('End');
    assert.equal(await control.inputValue(),'100');assert.equal(await control.getAttribute('aria-valuetext'),'Light theme: 100%. Dark theme: 0%.');
    await page.locator('[data-language="pt"]').click();assert.equal(await control.inputValue(),'100');assert.equal(await control.getAttribute('aria-valuetext'),'Tema claro: 100%. Tema escuro: 0%.');
    await page.locator('[data-language="en"]').click();
   }
  }
  await page.goto('http://localhost:4173');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await page.locator('[data-language="pt"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('html').getAttribute('lang'),'pt-BR');
  const reduced=await sample(0);assert.equal(reduced.portrait,1);assert.equal(reduced.angle,360);assert(reduced.rows.every(x=>x===1));assert(reduced.following.every(x=>x===1));
  fs.writeFileSync('.qa/hero-language-report.json',JSON.stringify({start,middle,circle,line,cascade,final,layouts,unchanged,errors},null,2));
  assert.deepEqual(errors,[]);
  console.log('Passed: ordered hero layers, stroke drawing, cascading dividers, locale preserves running and completed motion, reduced motion, visible language controls on all pages at five widths, persistence and keyboard controls.');
  console.log('Unchanged copy:',JSON.stringify(unchanged));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
