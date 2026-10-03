const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.PORTFOLIO_URL || 'http://localhost:4173';
const standingData=JSON.parse(fs.readFileSync('assets/models/stand-up.js','utf8').match(/export default (\{.*\});/s)[1]);
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.url());});
  await page.clock.install();
  await page.goto(base);
  const pet=page.locator('.chibi-pet');
  await pet.waitFor();
  await page.waitForFunction(()=>document.querySelector('.chibi-pet').dataset.x);
  // Pause wall-clock progression so GPU speed cannot consume the 10-second
  // grab while Playwright issues many moves. Advance the animation explicitly.
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+60_000));
  await page.mouse.move(300,200);
  await page.clock.runFor(400);
  assert(Number(await pet.getAttribute('data-look-yaw'))<-.1,'Idle character watches a distant pointer');
  await page.screenshot({path:'.qa/chibi-idle-page.png'});
  assert.equal(await pet.getAttribute('data-state'),'idle');
  assert(Number(await pet.getAttribute('data-x'))>1200,'Starts at bottom right');
  await page.mouse.move(1370,900);
  assert.equal(await pet.getAttribute('data-state'),'attached');
  assert.equal(await pet.getAttribute('data-animation'),'Hanging Idle');
  await page.mouse.move(600,320,{steps:20});
  await page.clock.runFor(150);
  const followed=await pet.evaluate(el=>({x:Number(el.dataset.x),y:Number(el.dataset.y),state:el.dataset.state}));
  assert(followed.x>400&&followed.y<400,'Character follows pointer to a different part of the page');
  for(let i=0;i<12;i++){
   await page.mouse.move(i%2?720:480,320);
   await page.clock.runFor(24);
  }
  await page.clock.runFor(70);
  const enlarged=Number(await pet.getAttribute('data-cursor-scale'));
  assert(enlarged>1.7,`Shaking enlarges cursor: ${enlarged}`);
  assert(await page.locator('html').evaluate(el=>el.classList.contains('chibi-cursor')));
  await page.screenshot({path:'.qa/chibi-shaking.png'});
  await page.clock.runFor(1300);
  const restingScale=Number(await pet.getAttribute('data-cursor-scale'));
  assert(restingScale<enlarged,'Cursor shrinks when shaking stops');
  await page.locator('[data-language="en"]').click();
  assert.equal(await pet.getAttribute('data-state'),'attached');
  assert.match(await page.locator('.chibi-trigger').getAttribute('aria-label'),/Play with/);
  await page.getByRole('tab',{name:'Decision',exact:true}).click();
  assert.equal(await page.getByRole('tab',{name:'Decision',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await pet.getAttribute('data-state'),'attached','Page controls remain clickable while carrying character');
  await page.mouse.move(700,380,{steps:5});
  await page.clock.runFor(300);
  await page.screenshot({path:'.qa/chibi-held.png',clip:{x:500,y:300,width:400,height:360}});
  const fits=()=>page.locator('.chibi-pet').evaluate(el=>{
   const b=JSON.parse(el.dataset.bounds);return b.left>=7&&b.right<=innerWidth-7&&b.top>=7&&b.bottom<=innerHeight-7;
  });
  for(const [cx,cy] of [[10,10],[1430,10],[1430,990],[10,990],[700,380]]){
   await page.mouse.move(cx,cy);await page.clock.runFor(60);assert(await fits(),`Window collision at ${cx},${cy}`);
  }
  // Accelerate the ten-second deadline. Browser time also drives the recovery.
  await page.clock.fastForward(10_000);
  await page.waitForFunction(()=>document.querySelector('.chibi-pet').dataset.state!=='attached');
  assert(!await page.locator('html').evaluate(el=>el.classList.contains('chibi-cursor')));
  const states=[];
  const clipSamples={Falling:[],Impact:[],StandUp:[],SadWalk:[]};
  const recoverySamples=120;
  for(let i=0;i<recoverySamples;i++){
   const state=await pet.getAttribute('data-state');
   assert(await fits(),`Recovery remains inside the viewport: ${state}`);
   if(!states.includes(state)){
    states.push(state);
    await page.screenshot({path:`.qa/chibi-${state}.png`});
   }
   if(state==='falling'){
    assert.equal(await pet.getAttribute('data-animation'),'Falling');
    clipSamples.Falling.push(Number(await pet.getAttribute('data-animation-time')));
   }
   if(state==='landed'){
    assert.equal(await pet.getAttribute('data-animation'),'Impact');
    clipSamples.Impact.push(Number(await pet.getAttribute('data-animation-time')));
   }
   if(state==='returning'){
    assert.equal(await pet.getAttribute('data-animation'),'Sad Walk');
    clipSamples.SadWalk.push(Number(await pet.getAttribute('data-animation-time')));
    if(clipSamples.SadWalk.length===3)await pet.locator('canvas').screenshot({path:'.qa/chibi-sad-walk.png'});
    if(clipSamples.SadWalk.length===6)await page.clock.fastForward(Number(await pet.getAttribute('data-return-duration'))*1000+100);
   }
   if(state==='standing'){
    assert.equal(await pet.getAttribute('data-animation'),'Stand Up');
    clipSamples.StandUp.push(Number(await pet.getAttribute('data-animation-time')));
    if(clipSamples.StandUp.length===14)await pet.locator('canvas').screenshot({path:'.qa/chibi-stand-up-middle.png'});
    if(clipSamples.StandUp.at(-1)>=standingData.duration-.35)await pet.locator('canvas').screenshot({path:'.qa/chibi-stand-up-end.png'});
   }
   if(state==='idle')break;
   await page.clock.runFor(state==='falling'||state==='landed'?50:300);
  }
  for(const state of ['landed','standing','returning','idle'])assert(states.includes(state),`Recovery includes ${state}: ${states}`);
  assert(!states.includes('brushing'),'Returns directly after standing up');
  assert(clipSamples.Falling.length>0,'The Falling FBX plays while airborne');
  assert(clipSamples.Impact.every(time=>time===clipSamples.Impact[0]),'Falling playback remains frozen during ground impact');
  assert(Math.max(...clipSamples.StandUp)>=standingData.duration-.35,'Plays the supplied Stand Up FBX to its final frames before walking');
  assert(Math.max(...clipSamples.SadWalk)-Math.min(...clipSamples.SadWalk)>.3,'Advances the supplied Sad Walk clip during the return');
  assert(Number(await pet.getAttribute('data-x'))>1200,'Returns to bottom right');
  assert(!await page.locator('html').evaluate(el=>el.classList.contains('chibi-cursor')));
  // Keyboard play/release and hide controls use the same lifecycle.
  await page.clock.runFor(1400);
  await page.locator('.chibi-trigger').focus();await page.keyboard.press('Enter');
  assert.equal(await pet.getAttribute('data-state'),'attached');
  await page.mouse.move(-10,200);
  assert.equal(await pet.getAttribute('data-state'),'falling','Leaving the viewport releases the cursor');
  await page.clock.resume();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.chibi-pet').dataset.state==='idle');
  assert.equal(await pet.getAttribute('data-state'),'idle');
  assert(await page.locator('.chibi-trigger').isHidden());
  assert(!await page.locator('html').evaluate(el=>el.classList.contains('chibi-cursor')));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>!document.querySelector('.chibi-trigger').disabled);
  await page.locator('.chibi-trigger').focus();await page.keyboard.press('Enter');
  assert.equal(await pet.getAttribute('data-state'),'attached','Restoring motion preference restores interaction');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.chibi-pet').dataset.state==='idle');
  for(const file of ['index','projetos','ordiny','cash-advance']){
   await page.goto(`${base}/${file}.html`);
   await pet.waitFor();
   assert.equal(await pet.getAttribute('data-state'),'idle');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('.chibi-close').focus();await page.keyboard.press('Enter');
  assert.equal(await pet.count(),0);
  await page.reload();assert.equal(await pet.count(),0,'Hidden preference persists for this session');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const touch=await mobile.newPage();
  await touch.goto(base);
  await touch.locator('.chibi-pet').waitFor();
  await touch.waitForFunction(()=>document.querySelector('.chibi-pet').dataset.x);
  await touch.screenshot({path:'.qa/chibi-mobile-idle.png'});
  const client=await mobile.newCDPSession(touch);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:326,y:745}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:300}]});
  await touch.waitForTimeout(180);
  assert.equal(await touch.locator('.chibi-pet').getAttribute('data-state'),'attached');
  assert(Number(await touch.locator('.chibi-pet').getAttribute('data-y'))<400);
  assert(await touch.locator('.chibi-pointer').isHidden(),'Touch keeps native input without a fake mouse cursor');
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await touch.locator('.chibi-pet').getAttribute('data-state'),'falling','Lifting the finger releases the character');
  assert(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await touch.screenshot({path:'.qa/chibi-mobile-held.png'});
  await mobile.close();
  fs.writeFileSync('.qa/chibi-report.json',JSON.stringify({followed,enlarged,restingScale,states,clipSamples,errors},null,2));
  assert.deepEqual(errors,[]);
  console.log('Passed: textured 3D model, supplied two-hand Hanging Idle, follow, enlarged cursor, ten-second recovery, fall/return clips, viewport collisions, exit release, distant head tracking, page controls, locale continuity, keyboard, reduced motion, touch and all pages.');
  console.log(JSON.stringify({followed,enlarged,restingScale,states}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
