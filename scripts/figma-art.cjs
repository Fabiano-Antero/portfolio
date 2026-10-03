// Export only the fixed artwork and prototype figures from the supplied Figma JSX.
// Page layout is implemented separately with responsive semantic HTML.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'.figma-proposal/asset-manifest.json'),'utf8').replace(/^\uFEFF/,''));
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function extract(file, id, doc, naturalWidth, naturalHeight, name) {
  const source = fs.readFileSync(path.join(root,'.figma-proposal',file),'utf8');
  const env = { className: '', ...Object.fromEntries(manifest.filter(item => item.doc === doc).map(item => [item.source,'../figma/'+item.name])) };
  const nodePosition = source.indexOf(`data-node-id="${id}"`);
  if (nodePosition < 0) throw new Error(`Missing figure node ${id} in ${file}`);
  let at = source.lastIndexOf('<div',nodePosition);
  const evaluate = expression => Function(...Object.keys(env), 'return ('+expression+')')(...Object.values(env));
  const whitespace = () => { while (/\s/.test(source[at] || '') && at < source.length) at++; };
  function expression() {
    let start = ++at, depth = 1, quote = null;
    while (at < source.length) {
      const c = source[at];
      if (quote) { if (c === '\\') at++; else if(c === quote) quote = null; }
      else if ('"\'`'.includes(c)) quote = c;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { const result=source.slice(start,at); at++; return evaluate(result); }
      at++;
    }
    throw new Error('Unclosed expression');
  }
  function element() {
    if(source[at++] !== '<') throw new Error('Expected JSX');
    const tag = source.slice(at).match(/^[\w.]+/)[0]; at+=tag.length;
    const attrs={}; let self=false;
    while (at<source.length) {
      whitespace();
      if (source.slice(at,at+2)==='/>') {at+=2;self=true;break;}
      if(source[at]==='>'){at++;break;}
      const key=source.slice(at).match(/^[\w-]+/)[0];at+=key.length;whitespace();
      let value=true;
      if(source[at]==='='){at++;whitespace();if(source[at]==='{')value=expression();else{const quote=source[at++], start=at;while(source[at]!==quote)at++;value=source.slice(start,at++);}}
      attrs[key]=value;
    }
    const children=[];
    if(!self)while(at<source.length){
      if(source.slice(at,at+2)==='</'){at=source.indexOf('>',at)+1;break;}
      if(source[at]==='<')children.push(element());
      else if(source[at]==='{')children.push(expression());
      else{let start=at;while(at<source.length&&!'<{'.includes(source[at]))at++;const value=source.slice(start,at).replace(/\s*\n\s*/g,' ').trim();if(value)children.push(value);}
    }
    return {tag:tag.replace('motion.',''),attrs,children};
  }
  const tree=element();
  function css(classes=''){
    const rules=[];const transform=[];
    const map={absolute:'position:absolute',relative:'position:relative',block:'display:block',flex:'display:flex',contents:'display:contents','flex-col':'flex-direction:column','flex-row':'flex-direction:row','flex-none':'flex:none','flex-1':'flex:1','shrink-0':'flex-shrink:0','grow':'flex-grow:1','items-start':'align-items:flex-start','items-center':'align-items:center','items-end':'align-items:flex-end','justify-start':'justify-content:flex-start','justify-end':'justify-content:flex-end','justify-center':'justify-content:center','justify-between':'justify-content:space-between','self-stretch':'align-self:stretch','content-stretch':'align-content:stretch','size-full':'width:100%;height:100%','w-full':'width:100%','h-full':'height:100%','w-px':'width:1px','h-px':'height:1px','min-h-px':'min-height:1px','min-w-px':'min-width:1px','max-w-none':'max-width:none','overflow-clip':'overflow:hidden','overflow-hidden':'overflow:hidden','overflow-x-clip':'overflow-x:hidden','overflow-y-auto':'overflow-y:auto','pointer-events-none':'pointer-events:none','object-cover':'object-fit:cover','object-contain':'object-fit:contain','whitespace-nowrap':'white-space:nowrap','whitespace-pre-wrap':'white-space:pre-wrap','text-left':'text-align:left','text-center':'text-align:center','font-bold':'font-weight:700','font-semibold':'font-weight:600','font-medium':'font-weight:500','font-normal':'font-weight:400','not-italic':'font-style:normal','italic':'font-style:italic','leading-none':'line-height:1','border-solid':'border-style:solid','border':'border-width:1px;border-style:solid','rounded-full':'border-radius:9999px','text-white':'color:white','text-black':'color:black','bg-white':'background:white','bg-black':'background:black','cursor-pointer':'cursor:default','inset-0':'inset:0','left-0':'left:0','top-0':'top:0','right-0':'right:0','bottom-0':'bottom:0','left-1/2':'left:50%','top-1/2':'top:50%','mb-0':'margin-bottom:0','leading-normal':'line-height:normal'};
    const props={w:'width',h:'height',size:'width',top:'top',left:'left',right:'right',bottom:'bottom',inset:'inset',gap:'gap',p:'padding',px:'padding-inline',py:'padding-block',pt:'padding-top',pb:'padding-bottom',pl:'padding-left',pr:'padding-right',rounded:'border-radius','rounded-tl':'border-top-left-radius','rounded-tr':'border-top-right-radius','rounded-bl':'border-bottom-left-radius','rounded-br':'border-bottom-right-radius',tracking:'letter-spacing',leading:'line-height',opacity:'opacity',shadow:'box-shadow','mask-position':'mask-position','mask-size':'mask-size',blur:'filter',border:'border-width',text:'font-size',bg:'background','min-w':'min-width','min-h':'min-height'};
    for(const c of classes.split(/\s+/)){
      if(c==='border-b'){rules.push('border-bottom-width:1px');continue;}
      if(c==='border-white'){rules.push('border-color:white');continue;}
      if(c==='border-black'){rules.push('border-color:black');continue;}
      if(c==='text-right'){rules.push('text-align:right');continue;}
      if(/^border-\d+$/.test(c)){rules.push('border-width:'+c.slice(7)+'px');continue;}
      if(c==='min-w-full'){rules.push('min-width:100%');continue;}
      if(c==='whitespace-pre'){rules.push('white-space:pre');continue;}
      if(c==='overflow-x-auto'){rules.push('overflow-x:auto');continue;}
      if(c==='overflow-y-clip'){rules.push('overflow-y:hidden');continue;}
      if(c==='overflow-auto'){rules.push('overflow:auto');continue;}
      if(map[c]){rules.push(map[c]);continue;}
      if(c==='-translate-x-1/2'){transform.push('translateX(-50%)');continue;}
      if(c==='-translate-y-1/2'){transform.push('translateY(-50%)');continue;}
      if(c==='-scale-y-100'){transform.push('scaleY(-1)');continue;}
      if(/^-?rotate-\d+$/.test(c)){transform.push(`rotate(${c.startsWith('-')?'-':''}${c.replace(/^-?rotate-/, '')}deg)`);continue;}
      if(/^opacity-\d+$/.test(c)){rules.push('opacity:'+Number(c.slice(8))/100);continue;}
      if(c==='mask-no-repeat'){rules.push('mask-repeat:no-repeat');continue;}
      if(c==='mask-alpha'){rules.push('mask-mode:alpha');continue;}
      if(c==='mask-intersect'){rules.push('mask-composite:intersect');continue;}
      if(c==='mask-no-clip'){rules.push('mask-clip:no-clip');continue;}
      if(c.startsWith('[')){rules.push(c.slice(1,-1));continue;}
      const m=c.match(/^(.+?)-\[(.*)\]$/);if(!m)continue;
      let [,key,value]=m;value=value.replaceAll('_',' ').replace(/calc\(([^)]+)\)/g,(_,math)=>'calc('+math.replace(/([\d%])([+-])(?=\d)/g,'$1 $2 ')+')');
      if(key==='rotate'){transform.push('rotate('+value+')');continue;}
      if(key==='border-t'){rules.push('border-top-width:'+value);continue;}
      if(key==='font'){const font=value.replaceAll("'",'').split(':')[0];rules.push(`font-family:'${font}',Arial,sans-serif`);continue;}
      if(key==='flex'){rules.push('flex:'+value);continue;}
      if(key==='mb'){rules.push('margin-bottom:'+value);continue;}
      if(key==='text'&&(value.startsWith('color:')||value.startsWith('#')||value.startsWith('rgba'))){rules.push('color:'+value.replace(/^color:/,''));continue;}
      if(key==='border'&&(value.startsWith('#')||value.startsWith('rgba'))){rules.push('border-color:'+value);continue;}
      if(key==='border'&&value.startsWith('var(--cash-color-')){rules.push('border-color:'+value);continue;}
      if(key==='blur'){rules.push('filter:blur('+value+')');continue;}
      if(props[key])rules.push(props[key]+':'+value);
      if(key==='size')rules.push('height:'+value);
    }
    if(transform.length)rules.push('transform:'+transform.join(' '));return rules.join(';');
  }
  function render(node){
    if(typeof node!=='object')return escape(node);
    const {tag,attrs,children}=node;
    let style=css(attrs.className||'');
    for(const [key,value] of Object.entries(attrs.style||{}))style+=';'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+value;
    const extra=Object.entries(attrs).filter(([key])=>!['className','style'].includes(key)).map(([key,value])=>` ${key}="${escape(value)}"`).join('');
    return `<${tag}${extra} style="${escape(style)}">`+(tag==='img'?'':children.map(render).join('')+`</${tag}>`);
  }
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="../css/fonts.css"><style>*{box-sizing:border-box;border-width:0;border-style:solid}body{margin:0;overflow:hidden}p{margin:0}img{display:block}a{color:inherit;text-decoration:none}#art{position:absolute;inset:0;width:${naturalWidth}px;height:${naturalHeight}px;transform-origin:top left}#art>div{width:${naturalWidth}px!important;height:${naturalHeight}px!important}#art{pointer-events:none}</style></head><body><div id="art" inert>${render(tree)}</div><script>function fit(){document.getElementById('art').style.transform='scale('+innerWidth/${naturalWidth}+')'}fit();addEventListener('resize',fit);</script></body></html>`;
  fs.mkdirSync(path.join(root,'assets/art'),{recursive:true});fs.writeFileSync(path.join(root,'assets/art',name+'.html'),html);
  console.log('Native figure:',name);
}
extract('implementation-ordiny-1.txt','237:807','o1',1440,868,'ordiny-product');
extract('implementation-cash.txt','272:364',3,390,874,'cash-home');
extract('implementation-cash.txt','272:635',3,390,844,'cash-onboarding');
extract('round2-cash-showcase.txt','301:448','cash2-showcase',390,844,'cash-home');
extract('round2-cash-showcase.txt','299:569','cash2-showcase',390,844,'cash-advance-review');
extract('round2-cash-showcase.txt','299:630','cash2-showcase',390,844,'cash-advance-tracking');
extract('round2-cash-pix.txt','299:680','cash2-pix',390,844,'cash-pix-review');
extract('round2-cash-resources.txt','299:738','cash2-resources',390,844,'cash-virtual-card');
extract('round2-cash-resources.txt','299:789','cash2-resources',390,844,'cash-savings-goal');
extract('round2-cash-resources.txt','299:834','cash2-resources',390,844,'cash-credit-review');
extract('round2-cash-system.txt','301:1253','cash2-system',616,130,'cash-components');
