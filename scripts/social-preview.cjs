const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const origin='https://fabianoantero.site';
const imagePath='assets/img/portfolio-share-20261014.png';
const pages=['index.html','projetos.html','ordiny.html','cash-advance.html','sandfit.html','aquilimpa.html'];
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&#39;',"'");
function build(){
 const image=fs.readFileSync(path.join(root,imagePath));
 if(image.toString('ascii',1,4)!=='PNG')throw new Error('The social preview must be a PNG image.');
 const width=image.readUInt32BE(16),height=image.readUInt32BE(20);
 for(const file of pages){
  const target=path.join(root,file);let html=fs.readFileSync(target,'utf8');
  html=html.replace(/\s*<!-- social-preview:start -->[\s\S]*?<!-- social-preview:end -->\s*/g,'');
  const title=decode(html.match(/<title>([^<]+)<\/title>/)[1]);
  const descriptionTag=html.match(/<meta\b(?=[^>]*\bname="description")[^>]*>/i);
  if(!descriptionTag)throw new Error('Missing page description: '+file);
  const description=decode(descriptionTag[0].match(/\bcontent="([^"]*)"/)[1]);
  const url=origin+(file==='index.html'?'/':'/'+file);
  const meta=(attribute,key,value)=>`<meta ${attribute}="${key}" content="${escape(String(value))}">`;
  const alt='Fabiano Antero com um halo luminoso laranja, acompanhado de suas competências em produto, UX/UI e desenvolvimento.';
  const block=['<!-- social-preview:start -->',
   meta('property','og:type','website'),meta('property','og:site_name','Fabiano Antero / Portfólio'),meta('property','og:locale','pt_BR'),
   meta('property','og:title',title),meta('property','og:description',description),meta('property','og:url',url),
   meta('property','og:image',origin+'/'+imagePath),meta('property','og:image:type','image/png'),meta('property','og:image:width',width),meta('property','og:image:height',height),meta('property','og:image:alt',alt),
   meta('name','twitter:card','summary_large_image'),meta('name','twitter:title',title),meta('name','twitter:description',description),meta('name','twitter:image',origin+'/'+imagePath),meta('name','twitter:image:alt',alt),
   '<!-- social-preview:end -->'].join('\n');
  html=html.replace('</title>','</title>\n'+block+'\n');
  fs.writeFileSync(target,html);
 }
 console.log(`Social preview updated on ${pages.length} portfolio pages (${width} × ${height}).`);
}
module.exports=build;
if(require.main===module)build();
