const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTFOLIO_URL||'http://localhost:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));
  page.on('pageerror',error=>errors.push(error.message));
  for(const file of ['index','projetos','ordiny','cash-advance']){
   await page.goto(`${base}/${file}.html`);await page.evaluate(()=>document.fonts.ready);
   for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:1000});
    let portuguese;
    for(const language of ['pt','en']){
     await page.locator(`[data-language="${language}"]`).click();
     const result=await page.evaluate(()=>{
      const visible=node=>!node.closest('[hidden]')&&node.getBoundingClientRect().width>0;
      const clipped=[...document.querySelectorAll('main h1,main h2,main h3,main p,main dd,main dt,main li,main figcaption,main .button,main .chapter-link')].filter(visible).filter(node=>{
       const range=document.createRange();range.selectNodeContents(node);const box=node.getBoundingClientRect();
       return [...range.getClientRects()].some(rect=>rect.width>0&&(rect.left<box.left-2||rect.right>box.right+2));
      }).map(node=>({text:node.innerText,width:node.clientWidth,scroll:node.scrollWidth}));
      const joined=[...document.querySelectorAll('main br')].filter(br=>getComputedStyle(br).display==='none').filter(br=>{
       const before=br.previousSibling?.textContent||'',after=br.nextSibling?.textContent||'';
       return before.trim()&&after.trim()&&!/\s$/.test(before)&&!/^\s/.test(after);
      }).map(br=>br.parentElement.innerText);
      const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT),texts=[];
      while(walker.nextNode()){
       const node=walker.currentNode;
       if(node.parentElement.closest('script,style,svg,.hero-skills,[data-no-translate]'))continue;
       const text=node.textContent.trim().replace(/\s+/g,' ');if(text.length>30)texts.push(text);
      }
      return {overflow:document.documentElement.scrollWidth>innerWidth,clipped,joined,texts};
     });
     if(language==='pt')portuguese=result.texts;
     else result.untranslated=result.texts.filter((text,index)=>text===portuguese[index]);
     report.push({file,width,language,...result});
     if([1440,390].includes(width))await page.screenshot({path:`.qa/text-${file}-${width}-${language}.png`});
    }
   }
  }
  await page.goto(`${base}/index.html`);await page.setViewportSize({width:390,height:1000});await page.locator('[data-language="pt"]').click();await page.locator('#contato').scrollIntoViewIfNeeded();await page.screenshot({path:'.qa/text-contact-mobile.png'});
  fs.writeFileSync('.qa/text-review-report.json',JSON.stringify({report,errors},null,2));
  const failures=report.filter(result=>result.overflow||result.clipped.length||result.joined.length||result.untranslated?.length);
  const summaries=failures.map(({file,width,language,overflow,clipped,joined,untranslated})=>({file,width,language,overflow,clipped,joined,untranslated}));
  if(failures.length)console.log(JSON.stringify(summaries,null,2));
  assert.deepEqual(summaries,[],'Text fits the viewport, hidden breaks preserve spaces and long passages translate');
  assert.deepEqual(errors,[]);
  console.log('Passed: text spacing, word separation, no clipped text, Portuguese and English coverage on four pages at five widths.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
