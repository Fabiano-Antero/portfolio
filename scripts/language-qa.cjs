const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4177';
const pages=['index.html','projetos.html','ordiny.html','cash-advance.html','sandfit.html'];
const rows=fs.readFileSync('assets/js/i18n.js','utf8').split(String.fromCharCode(96))[1].trim().split('\n').map(row=>row.split('|').map(text=>text.trim().replace(/\s+/g,' ')));
assert(rows.every(row=>row.length===3&&row.every(text=>text.trim())),'Every translation has PT, EN and ES');
const translations=new Map(rows.map(([pt,en,es])=>[pt.trim().replace(/\s+/g,' '),{en,es}]));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const results=[],unmapped={};
  for(const width of [1440,1024,768,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
   const choose=async locale=>{
    if(width<768){await page.locator('[data-mobile-language]').click();await page.locator(`[data-mobile-language-option="${locale}"]`).click();}
    else await page.locator(`[data-language="${locale}"]`).click();
   };
   page.on('pageerror',error=>errors.push(error.message));await page.route('https://www.clarity.ms/**',r=>r.abort());
   await page.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
   for(const file of pages){
    await page.goto(base+'/'+file,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
    assert.deepEqual(await page.locator('.language button').allTextContents(),['PT','ESP','ENG']);
    await choose('pt');
    const originals=await page.evaluate(()=>{
     const nodes=[],walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
     while(walker.nextNode())if(!walker.currentNode.parentElement.closest('script,style,svg,[data-no-translate],.chibi-chat'))nodes.push(walker.currentNode.textContent.trim().replace(/\s+/g,' '));
     return nodes;
    });
    const englishCount=originals.filter(text=>translations.has(text)).length;
    assert(englishCount>20,'Page has translated content');
    if(width===1440)unmapped[file]=[...new Set(originals.filter(text=>text&&!translations.has(text)))];
    for(const [button,locale] of [['ESP','es'],['ENG','en'],['PT','pt-BR']]){
     await choose(locale==='pt-BR'?'pt':locale);
     assert.equal(await page.locator('html').getAttribute('lang'),locale);
     assert.equal(await page.locator('.language button[aria-pressed=true]').innerText(),button);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${file} ${locale} fits viewport`);
     assert.equal(await page.locator('.site-footer .mono').first().innerText(),locale==='es'?'FABIANO ANTERO / PORTAFOLIO 2019 / 2026':locale==='en'?'FABIANO ANTERO / PORTFOLIO 2019 / 2026':'FABIANO ANTERO / PORTFÓLIO 2019 / 2026');
     const translated=await page.evaluate(()=>{
      const nodes=[],walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
      while(walker.nextNode())if(!walker.currentNode.parentElement.closest('script,style,svg,[data-no-translate],.chibi-chat'))nodes.push(walker.currentNode.textContent.trim().replace(/\s+/g,' '));
      return nodes;
     });
     assert.equal(translated.length,originals.length,'Language preserves text nodes');
     originals.forEach((original,i)=>{const expected=translations.get(original)?.[locale];assert.equal(translated[i],expected||original,`${file} ${locale}: ${original}`);});
    }
    await choose('es');await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('html').getAttribute('lang'),'es','Language survives reload');
    if((width===1440||width===390)&&file==='index.html')await page.locator('.hero').screenshot({path:`.qa/spanish-hero-${width}.png`,style:'.skip-link{display:none!important}'});
    if((width===1440||width===390)&&file==='sandfit.html')await page.locator('.sandfit-intro').screenshot({path:`.qa/spanish-sandfit-${width}.png`,style:'.skip-link{display:none!important}'});
    results.push({width,file,languages:3,translated:englishCount});
   }
   assert.deepEqual(errors,[]);await page.close();console.log('Passed responsive languages at',width);
  }
  fs.writeFileSync('.qa/language-report.json',JSON.stringify(results,null,2));fs.writeFileSync('.qa/language-unmapped.json',JSON.stringify(unmapped,null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
