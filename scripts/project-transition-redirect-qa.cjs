const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let base=process.env.PORTFOLIO_URL;
const pages=['projetos','ordiny','cash-advance','sandfit'];
(async()=>{
 let server;
 if(!base){
  const root=path.resolve(__dirname,'..');
  server=http.createServer((request,response)=>{
   const url=new URL(request.url,'http://localhost'),file=url.pathname.slice(1);
   if(pages.some(name=>file===name+'.html')){response.writeHead(302,{Location:'/'+file.slice(0,-5)+url.search});return response.end();}
   const filename=path.join(root,pages.includes(file)?file+'.html':file||'index.html');
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
   fs.readFile(filename,(error,content)=>{response.writeHead(error?404:200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});response.end(error?'Not found':content);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 }
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const [width,height] of [[1440,1000],[390,844]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   if(process.env.TRANSITION_QA_DEBUG)page.on('console',message=>console.log(message.text()));
   await page.route('https://www.clarity.ms/**',route=>route.abort());
   await page.addInitScript(()=>{
    sessionStorage.setItem('portfolio-chibi-hidden','true');
    window.revealFrames=[];
    let sampling=false;
    const observer=new MutationObserver(()=>{
     const root=document.querySelector('.project-transition[data-phase="opening"]');
     if(!root||sampling)return;sampling=true;
     function sample(){
      if(!root.isConnected){sampling=false;return;}
      window.revealFrames.push([...root.querySelectorAll('.project-transition-band')].map(band=>new DOMMatrix(getComputedStyle(band).transform).m41));
      requestAnimationFrame(sample);
     }
     requestAnimationFrame(sample);
    });observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase']});
   });
   await page.goto(base,{waitUntil:'domcontentloaded'});
   for(const destination of ['ordiny','projetos','cash-advance','projetos','sandfit']){
    await page.locator(`a[href="${destination}.html"]`).first().evaluate(link=>link.click());
    await page.waitForURL(url=>url.pathname==='/'+destination);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.project-transition',{state:'detached'});
    const frames=await page.evaluate(()=>window.revealFrames);
    assert(frames.length>2,'Destination must render the reverse animation: '+destination+' frames='+frames.length+' errors='+errors.join(','));
    for(let band=0;band<8;band++)assert(Math.max(...frames.map(frame=>Math.abs(frame[band])))>100,'Every band must visibly retract: '+destination+' / '+band);
    assert.equal(await page.evaluate(()=>document.body.inert),false);
    console.log('Reverse animation verified:',width,destination,frames.length,'frames');
   }
   await page.locator('.chapter-link').first().evaluate(link=>link.click());
   assert.equal(await page.locator('.project-transition').count(),0,'Clean URL chapter links remain immediate');
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
