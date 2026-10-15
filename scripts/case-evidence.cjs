const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function build(){
 const data=JSON.parse(fs.readFileSync(path.join(root,'assets/data/case-evidence.json'),'utf8'));
 const rows=[['RESUMO DO PROJETO','PROJECT SUMMARY','RESUMEN DEL PROYECTO']];
 const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 for(const [file,items] of Object.entries(data)){
  const translated=values=>{rows.push(values);return esc(values[0]);};
  const block=`<!-- case-evidence:start --><aside class="case-evidence" aria-labelledby="case-evidence-title"><p class="mono" id="case-evidence-title">${esc(rows[0][0])}</p><div class="case-evidence-grid">${items.map(item=>`<article><p class="mono">${translated(item.label)}</p><h3>${translated(item.title)}</h3><p>${translated(item.text)}</p></article>`).join('')}</div></aside><!-- case-evidence:end -->`;
  const target=path.join(root,file);let html=fs.readFileSync(target,'utf8');
  html=html.replace(/<!-- case-evidence:start -->[\s\S]*?<!-- case-evidence:end -->/,'');
  html=html.replace(/(<nav class="(?:chapter-nav[^\"]*|sandfit-chapters)"[\s\S]*?<\/nav>)/,`$1${block}`);
  html=html.replace(/<script src="assets\/js\/case-evidence-copy\.js[^\"]*" defer><\/script>/g,'');
  html=html.replace('<script src="assets/js/i18n.js','<script src="assets/js/case-evidence-copy.js?v=20261014-local-review" defer></script><script src="assets/js/i18n.js');
  html=html.replace(/site\.css\?v=[^"\s]+/g,'site.css?v='+(file==='ordiny.html'?'20261015-ordiny-comparison':'20261014-local-review')).replace(/i18n\.js\?v=[^"\s]+/g,'i18n.js?v=20261014-local-review').replace(/chibi-loader\.js\?v=[^"\s]+/g,'chibi-loader.js?v=20261014-local-review');
  fs.writeFileSync(target,html);
 }
 fs.writeFileSync(path.join(root,'assets/js/case-evidence-copy.js'),'window.portfolioTranslations=[...(window.portfolioTranslations||[]),...'+JSON.stringify(rows,null,2)+'];\n');
}
module.exports=build;
if(require.main===module)build();
