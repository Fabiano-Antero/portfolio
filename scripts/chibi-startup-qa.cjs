const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4173';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const results=[];
  for(const [width,reducedMotion] of [[1440,'no-preference'],[390,'no-preference'],[390,'reduce']]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://www.clarity.ms/**',r=>r.abort());
   await page.route('**/assets/js/chibi-pet.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('assets/js/chibi-pet.js','utf8').replace('renderer.render(scene,camera);lastRender=now;',`renderer.render(scene,camera);if(!window.startPoseQA){const sample=name=>idleClip.tracks.find(track=>track.name===name).createInterpolant().evaluate(idleAction.time);window.startPoseQA={state,armError:Math.max(...['LeftArm','RightArm'].map(name=>sample('mixamorig'+name+'.quaternion').reduce((m,v,i)=>Math.max(m,Math.abs(v-bone(name).quaternion.toArray()[i])),0)))};}lastRender=now;`)}));
   await page.goto(base,{waitUntil:'domcontentloaded'});
   const preview=page.locator('.chibi-placeholder img');
   await preview.waitFor();await page.waitForFunction(()=>document.querySelector('.chibi-placeholder img')?.naturalWidth===240);
   assert((await preview.getAttribute('src')).includes('20261005-idle'));
   if(reducedMotion==='reduce')assert.equal(await page.locator('.chibi-pet canvas').count(),0);
   else {
    await page.waitForFunction(()=>window.startPoseQA,null,{timeout:30000});
    const first=await page.evaluate(()=>window.startPoseQA);
    assert.equal(first.state,'idle');assert(first.armError<.00001,'First render uses authored Idle arms, without blending the bind pose');
    await page.waitForFunction(()=>!document.querySelector('.chibi-placeholder'));
    const pet=page.locator('.chibi-pet');assert.equal(await pet.getAttribute('data-animation'),'Idle');
    await page.mouse.move(60,80);await page.waitForFunction(()=>Number(document.querySelector('.chibi-pet').dataset.lookYaw)<-.3);
    assert(await page.locator('.chibi-chat-launcher').isVisible());
    await pet.locator('canvas').screenshot({path:`.qa/chibi-startup-${width}.png`});
    results.push({width,first});
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log(JSON.stringify({results,reducedMotionPreview:true}));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
