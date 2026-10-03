const { chromium } = require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('.qa',{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage();
  const errors=[];const failed=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://localhost:4173'))failed.push(response.url());});
  const report=[];
  for(const file of ['index.html','projetos.html','ordiny.html','cash-advance.html'])for(const width of [1440,390,320,768]){
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});await page.goto('http://localhost:4173/'+file,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(async()=>{for(const img of document.images){img.loading='eager';}for(const frame of document.querySelectorAll('iframe'))frame.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
    await page.waitForTimeout(300);
    const result={file,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),height:await page.evaluate(()=>document.body.scrollHeight),images:await page.evaluate(()=>[...document.images].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src))};
    for(const frame of page.frames())if(frame!==page.mainFrame()){
      const missing=await frame.evaluate(()=>[...document.images].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src));result.images.push(...missing);
    }
    report.push(result);console.log(result);
    if(width===1440||width===390)await page.screenshot({path:`.qa/${file.replace('.html','')}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://localhost:4173',{waitUntil:'networkidle'});
  await page.locator('#tab-decisao').click();if(!(await page.locator('#panel-decisao').isVisible()))throw Error('Decisão tab failed');
  await page.locator('#tab-decisao').press('ArrowRight');if(!(await page.locator('#panel-entrega').isVisible()))throw Error('Keyboard tabs failed');
  await page.goto('http://localhost:4173/ordiny.html',{waitUntil:'networkidle'});await page.locator('.comparison').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  const first=await page.locator('.comparison-sweep').evaluate(node=>getComputedStyle(node).clipPath);await page.waitForTimeout(1200);const second=await page.locator('.comparison-sweep').evaluate(node=>getComputedStyle(node).clipPath);
  if(first!==second)throw Error('Comparison moved without user input');
  const control=page.locator('.comparison-control');
  await control.focus();await control.press('ArrowRight');if(await control.inputValue()!=='51')throw Error('Comparison keyboard arrow failed');
  await control.press('Home');if(await control.inputValue()!=='0')throw Error('Comparison keyboard Home failed');
  await control.press('End');if(await control.inputValue()!=='100')throw Error('Comparison keyboard End failed');
  const bounds=await control.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.25,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.75,bounds.y+bounds.height*.5,{steps:8});await page.mouse.up();
  if(Math.abs(Number(await control.inputValue())-75)>1)throw Error('Comparison mouse drag failed');
  await page.emulateMedia({reducedMotion:'reduce'});if(await page.locator('.comparison-sweep').evaluate(node=>getComputedStyle(node).animationName)!=='none')throw Error('Reduced motion failed');
  await control.press('ArrowLeft');if(Math.abs(Number(await control.inputValue())-74)>1)throw Error('Comparison reduced motion input failed');
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const touchPage=await mobile.newPage();
  await touchPage.goto('http://localhost:4173/ordiny.html',{waitUntil:'networkidle'});await touchPage.locator('.comparison-control').scrollIntoViewIfNeeded();
  const touchBounds=await touchPage.locator('.comparison-control').boundingBox();
  await touchPage.touchscreen.tap(touchBounds.x+touchBounds.width*.25,touchBounds.y+touchBounds.height*.5);
  if(Math.abs(Number(await touchPage.locator('.comparison-control').inputValue())-25)>1)throw Error('Comparison touch failed');
  const cdp=await mobile.newCDPSession(touchPage);const y=touchBounds.y+touchBounds.height*.5;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBounds.x+touchBounds.width*.25,y}]});
  for(const proportion of [.35,.5,.65,.75])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchBounds.x+touchBounds.width*proportion,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(Math.abs(Number(await touchPage.locator('.comparison-control').inputValue())-75)>1)throw Error('Comparison touch drag failed');
  await mobile.close();
  fs.writeFileSync('.qa/report.json',JSON.stringify({report,errors,failed,interactions:'passed',manualComparison:'mouse, touch, keyboard and reduced motion passed'},null,2));
  if(report.some(x=>x.overflow||x.images.length)||errors.length||failed.length)throw Error('Browser checks failed; see .qa/report.json');
  console.log('Browser checks passed, including tabs, manual comparison, touch and reduced motion.');
  await browser.close();
})();
