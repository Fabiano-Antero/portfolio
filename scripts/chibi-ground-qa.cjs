const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PNG}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const readClip=file=>JSON.parse(fs.readFileSync(`assets/models/${file}.js`,'utf8').match(/export default (\{.*\});/s)[1]);
const falling=readClip('falling'),standing=readClip('stand-up'),walking=readClip('sad-walk');
const root=walking.tracks.find(track=>track.name==='mixamorigHips.position');
const stride=Math.hypot(root.values.at(-3)-root.values[0],root.values.at(-1)-root.values[2]);
const expectedCyclePixels=stride*240/1.46;
const base=process.env.PORTFOLIO_URL||'http://localhost:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report=[];
 try {
  for(const scenario of [{name:'desktop-low',width:1440,height:1000,low:true},{name:'desktop-high',width:1440,height:1000},{name:'mobile-high',width:390,height:844,touch:true}]) {
   const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},isMobile:!!scenario.touch,hasTouch:!!scenario.touch});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/chibi-ground-studio.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#101114;--coral:#ff6b3d;height:100vh}.chibi-close{display:none!important}</style><link rel="stylesheet" href="/assets/css/chibi-pet.css"><script type="module" src="/assets/js/chibi-pet.js"></script></head><body></body></html>'}));
   await page.clock.install();await page.goto(`${base}/chibi-ground-studio.html`);
   await page.waitForFunction(()=>document.querySelector('.chibi-pet')?.dataset.x);
   await page.clock.pauseAt(await page.evaluate(()=>Date.now()+60_000));
   const pet=page.locator('.chibi-pet'),cx=Math.round(scenario.width*.25),cy=scenario.low?scenario.height-24:140;
   let client;
   if(scenario.touch){
    client=await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scenario.width-64,y:scenario.height-100}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx,y:cy}]});
   }else{await page.mouse.move(scenario.width-64,scenario.height-100);await page.mouse.move(cx,cy);}
   await page.clock.runFor(600);
   assert.equal(await pet.getAttribute('data-state'),'attached',scenario.name);
   if(scenario.touch)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.press('Escape');
   await page.clock.runFor(16); // Collision is resolved on the first rendered physics frame.
   for(let i=0;i<100 && await pet.getAttribute('data-state')==='falling';i++){
    const box=await pet.evaluate(el=>JSON.parse(el.dataset.bounds));
    assert(box.bottom<scenario.height-15,'Airborne motion cannot continue at the floor');
    await page.clock.runFor(16);
   }
   assert.equal(await pet.getAttribute('data-state'),'landed');
   assert.equal(await pet.getAttribute('data-animation'),'Impact');
   const impactTime=Number(await pet.getAttribute('data-animation-time'));
   assert(impactTime<falling.duration,'Impact interrupts the Falling clip before its end');
   assert(Math.abs((await pet.evaluate(el=>JSON.parse(el.dataset.bounds))).bottom-(scenario.height-16))<.1,'Exact mesh contact with the viewport floor');
   const firstPath=`.qa/chibi-${scenario.name}-impact.png`,secondPath=`.qa/chibi-${scenario.name}-impact-held.png`;
   await pet.locator('canvas').screenshot({path:firstPath});
   await page.clock.runFor(70);
   assert.equal(await pet.getAttribute('data-state'),'landed');
   assert.equal(Number(await pet.getAttribute('data-animation-time')),impactTime,'The airborne clip clock stays stopped');
   await pet.locator('canvas').screenshot({path:secondPath});
   const a=PNG.sync.read(fs.readFileSync(firstPath)),b=PNG.sync.read(fs.readFileSync(secondPath));
   assert.deepEqual(b.data,a.data,'The rendered collision pose stays frozen');
   await page.clock.runFor(150);
   assert.equal(await pet.getAttribute('data-animation'),'Stand Up');
   await page.clock.fastForward(standing.duration*1000+100);await page.clock.runFor(32);
   assert.equal(await pet.getAttribute('data-state'),'returning','Standing transitions directly to walking');
   await page.clock.runFor(600);
   assert.equal(await pet.getAttribute('data-animation'),'Sad Walk');
   const start=Number(await pet.getAttribute('data-x'));
   await page.clock.runFor(walking.duration*1000);
   const advance=Number(await pet.getAttribute('data-x'))-start;
   assert(Math.abs(advance-expectedCyclePixels)<1.5,`Travel follows one authored stride: ${advance} vs ${expectedCyclePixels}`);
   await pet.locator('canvas').screenshot({path:`.qa/chibi-${scenario.name}-walking.png`});
   const measured=[];
   for(let i=0;i<4;i++){const before=Number(await pet.getAttribute('data-x'));await page.clock.runFor(400);measured.push((Number(await pet.getAttribute('data-x'))-before)/.4);}
   assert(Math.max(...measured)-Math.min(...measured)<1,'Travel does not accelerate past the gait in the middle of the return');
   assert(measured.every(speed=>speed<50),'Return uses the slow Sad Walk pace');
   assert.deepEqual(errors,[]);
   report.push({scenario:scenario.name,impactTime,advance,expectedCyclePixels,measured,errors});
   await context.close();
  }
  fs.writeFileSync('.qa/chibi-ground-report.json',JSON.stringify(report,null,2));
  console.log('Passed: impact interrupts airborne motion, frozen collision poses, Stand Up transition, stride-matched constant walking speed on desktop/mobile.',JSON.stringify(report));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
