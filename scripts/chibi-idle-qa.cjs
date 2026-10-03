const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PNG}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/chibi-idle-studio.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#101114;height:100vh;--coral:#ff6b3d}.chibi-close{display:none!important}</style><link rel="stylesheet" href="/assets/css/chibi-pet.css"><script type="module" src="/assets/js/chibi-pet.js"></script></head><body></body></html>'}));
  // Expose the evaluated skeleton in this test only, for a check against the
  // supplied clip rather than merely checking the animation label.
  await page.route('**/assets/js/chibi-pet.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('assets/js/chibi-pet.js','utf8').replace('setState(\'idle\');language();motion();schedule();',"window.idleQA=()=>({time:idleAction.time,head:bone('Head').quaternion.toArray(),arm:bone('LeftArm').quaternion.toArray(),hips:bone('Hips').position.toArray()});setState('idle');language();motion();schedule();")}));
  await page.clock.install();await page.goto(`${base}/chibi-idle-studio.html`);
  await page.waitForFunction(()=>document.querySelector('.chibi-pet')?.dataset.x);
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+60_000));
  const pet=page.locator('.chibi-pet');
  assert.equal(await pet.getAttribute('data-animation'),'Idle');
  await pet.locator('canvas').screenshot({path:'.qa/chibi-idle-start.png'});
  const start=await page.evaluate(()=>idleQA());
  await page.clock.runFor(1200);
  await pet.locator('canvas').screenshot({path:'.qa/chibi-idle-body.png'});
  const next=await page.evaluate(()=>idleQA());
  assert(next.arm.some((v,i)=>Math.abs(v-start.arm[i])>.0001),'Authored Idle moves the arms while the cursor is stationary');
  const a=PNG.sync.read(fs.readFileSync('.qa/chibi-idle-start.png')),b=PNG.sync.read(fs.readFileSync('.qa/chibi-idle-body.png'));
  let changed=0;for(let i=0;i<a.data.length;i+=4)if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>30)changed++;
  assert(changed>50,`Visible Idle movement: ${changed} pixels`);
  await page.mouse.move(900,150);await page.clock.runFor(1400);
  assert(Number(await pet.getAttribute('data-look-yaw'))<-.4);
  assert(Number(await pet.getAttribute('data-look-pitch'))<-.25);
  const verify=()=>page.evaluate(async()=>{
   const THREE=await import('/assets/vendor/three/three.module.js');
   const {default:data}=await import('/assets/models/idle.js');
   const clip=THREE.AnimationClip.parse(data),actual=idleQA(),el=document.querySelector('.chibi-pet');
   const sample=name=>Array.from(clip.tracks.find(track=>track.name===name).createInterpolant().evaluate(actual.time));
   const expectedHead=new THREE.Quaternion().fromArray(sample('mixamorigHead.quaternion'));
   expectedHead.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Number(el.dataset.lookPitch),Number(el.dataset.lookYaw),0)));
   return {headError:expectedHead.angleTo(new THREE.Quaternion().fromArray(actual.head)),armError:sample('mixamorigLeftArm.quaternion').reduce((m,v,i)=>Math.max(m,Math.abs(v-actual.arm[i])),0),hipsError:sample('mixamorigHips.position').reduce((m,v,i)=>Math.max(m,Math.abs(v-actual.hips[i])),0),time:actual.time};
  });
  const combined=await verify();
  assert(combined.headError<.002,'Cursor rotation is added to the authored head quaternion');
  assert(combined.armError<.00001&&combined.hipsError<.00001,'Original Idle body tracks remain untouched');
  await pet.locator('canvas').screenshot({path:'.qa/chibi-idle-looking-left.png'});
  await page.mouse.move(1438,650);await page.clock.runFor(1400);
  assert(Number(await pet.getAttribute('data-look-yaw'))>.1,'Head follows the pointer toward the right');
  await pet.locator('canvas').screenshot({path:'.qa/chibi-idle-looking-right.png'});
  const before=await page.evaluate(()=>idleQA().time);
  await page.evaluate(()=>{document.documentElement.lang='en';document.dispatchEvent(new Event('portfolio:language'));});
  assert.equal(await page.evaluate(()=>idleQA().time),before,'Language changes preserve Idle phase');
  await page.clock.fastForward(8334);await page.clock.runFor(120);
  assert.equal(await pet.getAttribute('data-state'),'idle');
  assert((await verify()).headError<.002,'Idle continues tracking after looping');
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(600);
  assert.equal(Number(await pet.getAttribute('data-animation-time')),0);
  const frozen=await page.evaluate(()=>idleQA());
  await page.mouse.move(100,100);await page.clock.runFor(1200);
  assert.deepEqual(await page.evaluate(()=>idleQA()),frozen,'Reduced motion freezes the body and head');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.runFor(1000);
  assert.notEqual(await page.evaluate(()=>idleQA().time),0,'Restoring motion resumes Idle');
  assert.equal(errors.length,0,errors.join('\n'));
  const report={changedPixels:changed,combined,looping:true,localePreserved:true,reducedMotion:true,errors};
  fs.writeFileSync('.qa/chibi-idle-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
