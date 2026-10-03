const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PNG}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/chibi-motion-studio.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><head><style>body{margin:0;background:#101114;--coral:#ff6b3d;height:100vh}</style><link rel="stylesheet" href="/assets/css/chibi-pet.css"><script type="module" src="/assets/js/chibi-pet.js"></script></head><body></body></html>'}));
  await page.clock.install();
  await page.goto(`${process.env.PORTFOLIO_URL || 'http://localhost:4173'}/chibi-motion-studio.html`);
  await page.waitForFunction(()=>document.querySelector('.chibi-pet')?.dataset.x);
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+60_000));
  await page.mouse.move(1370,900);await page.mouse.move(620,300);
  const pet=page.locator('.chibi-pet');
  assert.equal(await pet.getAttribute('data-animation'),'Hanging Idle');
  await page.clock.runFor(600);
  const firstTime=Number(await pet.getAttribute('data-animation-time'));
  await pet.locator('canvas').screenshot({path:'.qa/chibi-hanging-first.png'});
  await page.clock.runFor(900);
  const secondTime=Number(await pet.getAttribute('data-animation-time'));
  assert(secondTime>firstTime+.8,'The authored clip advances at its original speed');
  await pet.locator('canvas').screenshot({path:'.qa/chibi-hanging-second.png'});
  await page.clock.runFor(2200);
  const loopTime=Number(await pet.getAttribute('data-animation-time'));
  assert(loopTime<1,'The 3.33-second hanging cycle repeats');
  assert.equal(await pet.getAttribute('data-state'),'attached');
  await pet.locator('canvas').screenshot({path:'.qa/chibi-hanging-loop.png'});
  for(let i=0;i<10;i++){await page.mouse.move(i%2?790:440,i%3?310:240);await page.clock.runFor(55);}
  assert(Number(await pet.getAttribute('data-cursor-scale'))>1.7,'Shaking still enlarges the cursor');
  await pet.locator('canvas').screenshot({path:'.qa/chibi-hanging-cursor.png'});
  const a=PNG.sync.read(fs.readFileSync('.qa/chibi-hanging-first.png'));
  const b=PNG.sync.read(fs.readFileSync('.qa/chibi-hanging-second.png'));
  let changedPixels=0,visiblePixels=0;
  for(let i=0;i<a.data.length;i+=4){
   if(a.data[i+3]>64)visiblePixels++;
   if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>45)changedPixels++;
  }
  assert(visiblePixels>3000,'The textured character remains visible');
  assert(changedPixels>400,'The hanging clip produces visible motion');
  assert.deepEqual(errors,[]);
  const report={firstTime,secondTime,loopTime,changedPixels,visiblePixels,errors};
  fs.writeFileSync('.qa/chibi-hanging-report.json',JSON.stringify(report,null,2));
  console.log('Passed: supplied Hanging Idle playback, original timing, looping, visible motion and enlarged cursor.',report);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
