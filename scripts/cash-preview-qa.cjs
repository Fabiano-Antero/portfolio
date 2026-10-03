const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('.qa',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://localhost:4173'))errors.push(`${response.status()} ${response.url()}`);});
 const report=[];
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1100});await page.goto('http://localhost:4173/cash-advance.html',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('iframe').forEach(frame=>frame.loading='eager');});
  await page.waitForLoadState('networkidle');
  const images=[];const figures=[];
  for(const frame of page.frames())if(frame!==page.mainFrame()){
   await frame.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
   images.push(...await frame.evaluate(()=>[...document.images].map(img=>{const rect=img.getBoundingClientRect();return{src:new URL(img.src).pathname,width:rect.width,height:rect.height,loaded:img.complete&&img.naturalWidth>0};})));
  }
  for(const frame of await page.locator('iframe.native-art').all())figures.push(await frame.evaluate(node=>({src:node.getAttribute('src'),width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
  const result={width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),headings:await page.locator('h1').count(),chapters:await page.locator('.chapter-nav a').count(),figures,images};
  if(result.overflow||result.headings!==1||result.chapters!==8||figures.some(figure=>Math.abs(figure.width/figure.height-(figure.src.includes('components')?616/130:390/844))>.002)||images.some(img=>!img.loaded||img.width<=0||img.height<=0))throw Error(`Layout or assets failed at ${width}`);
  report.push(result);console.log({width,overflow:result.overflow,chapters:result.chapters,figures:figures.length,images:images.length});
  if(width===1440||width===390){
   await page.screenshot({path:`.qa/cash-refined-hero-${width}.png`});
   for(const target of ['.cash-screen-grid-three','#contexto','#pesquisa','#jornada','#antecipacao','#pix','#recursos','#sistema','#entrega'])await page.locator(target).first().screenshot({path:`.qa/cash-refined-${target.replace(/[^a-z]/g,'')}-${width}.png`,style:'.skip-link:not(:focus){opacity:0}'});
  }
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://localhost:4173/cash-advance.html',{waitUntil:'networkidle'});
 for(const target of ['contexto','pesquisa','jornada','antecipacao','pix','recursos','sistema','entrega']){
  const link=page.locator(`.chapter-nav a[href="#${target}"]`);await link.click();
  if(await page.evaluate(()=>document.activeElement.id)!==target)throw Error(`Chapter focus failed: ${target}`);
 }
 if(await page.locator('.cash-opening a[target="_blank"]').getAttribute('href')!=='https://www.figma.com/design/fefHh4hpGhh7oC2ZuGVMlk/?node-id=3012-55')throw Error('Current study link missing');
 fs.writeFileSync('.qa/cash-refined-report.json',JSON.stringify({report,errors,chapters:'passed'},null,2));
 if(errors.length)throw Error(errors.join('\n'));await browser.close();console.log('Cash Advance layout, local assets and chapter navigation passed.');
})().catch(error=>{console.error(error);process.exit(1)});
