const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const report=[];
  for(const width of [1440,768,390,320]) {
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://www.clarity.ms/**',r=>r.abort());
   await page.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
   await page.goto(base+'/sandfit.html');
   assert.equal(await page.locator('h1').innerText(),'Sandfit Arena.');
   assert.equal(await page.locator('.sandfit-chapters a').count(),8);
   assert.equal(await page.locator('.sandfit-screen').count(),4);
   assert.equal(await page.locator('.sandfit-palette>div').count(),6);
   for(const element of await page.locator('.native-art').all())await element.scrollIntoViewIfNeeded();
   for(const frame of page.frames().slice(1)) {
    await frame.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
    assert.equal(await frame.locator('#art').count(),1);
    const invalid=await frame.locator('img').evaluateAll(images=>images.filter(image=>{const b=image.getBoundingClientRect();return !b.width||!b.height}).map(image=>image.src));assert.deepEqual(invalid,[]);
   }
   for(const link of await page.locator('.sandfit-chapters a').all()) {
    const href=await link.getAttribute('href');assert.equal(await page.locator(href).count(),1);
   }
   const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   assert(!(await overflow()),'PT page fits viewport');
   if(width===1440||width===390) {
    await page.screenshot({path:`.qa/sandfit-${width}-pt.png`,fullPage:true});
    for(const section of ['.sandfit-intro','.sandfit-showcase','#descoberta','#reserva'])await page.locator(section).screenshot({path:`.qa/sandfit-${section.replace(/[^a-z]/g,'')}-${width}.png`});
   }
   await page.getByRole('button',{name:'ENG',exact:true}).click();
   assert.equal(await page.locator('html').getAttribute('lang'),'en');
   assert((await page.locator('.sandfit-thesis').innerText()).includes('Booking with clarity.'));
   assert((await page.locator('#encerramento').innerText()).includes('confidentiality'));
   assert(!(await overflow()),'EN page fits viewport');
   await page.getByRole('button',{name:'PT',exact:true}).click();
   await page.goto(base+'/index.html#projetos');
   assert.equal(await page.locator('#projetos .featured-project,#projetos .project-card').count(),3);
   assert.equal(await page.locator('#projetos .project-card a[href="sandfit.html"]').count(),2);
   assert.equal(await page.locator('#projetos a[href*="Lumen-simulador"]').count(),0);
   await page.locator('.sandfit-home-cover').scrollIntoViewIfNeeded();
   if(width===1440||width===390)await page.locator('#projetos').screenshot({path:`.qa/sandfit-home-${width}.png`});
   assert(!(await overflow()),'Home fits viewport');
   await page.goto(base+'/projetos.html');
   assert.equal(await page.locator('.collection-grid .project-card').count(),5);
   assert.equal(await page.locator('.collection-grid a[href="sandfit.html"]').count(),2);
   assert(await page.getByRole('heading',{name:'Lumen',exact:true}).isVisible());
   assert.deepEqual(errors,[]);
   report.push({width,chapters:8,screens:4,homeCases:3,collectionProjects:5,ptEn:true,overflow:false,errors});await page.close();
  }
  fs.writeFileSync('.qa/sandfit-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
