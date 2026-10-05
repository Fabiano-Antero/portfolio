const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const errors=[];
const pages=['index.html','projetos.html','ordiny.html','cash-advance.html'];
const art=fs.readdirSync(path.join(root,'assets/art')).filter(file=>file.endsWith('.html')).map(file=>'assets/art/'+file);
for(const file of [...pages,...art]){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const refs=[...source.matchAll(/(?:src|href)="([^"#]+)(?:#[^"]*)?"/g)].map(match=>match[1]);
  const cssUrls=[...source.matchAll(/url\((?:&quot;|['"])?([^)'"&]+)(?:&quot;|['"])?\)/g)].map(match=>match[1]);
  const responsiveRefs=[...source.matchAll(/\bsrcset="([^"]+)"/g)].flatMap(match=>match[1].split(',').map(image=>image.trim().split(/\s+/)[0]));
  for(const ref of [...refs,...cssUrls,...responsiveRefs]){
    if(/^(https?:|mailto:|data:)/.test(ref))continue;
    const resource=ref.split(/[?#]/,1)[0];
    const target=resource.startsWith('/')?path.resolve(root,'.'+resource):path.resolve(path.dirname(path.join(root,file)),resource);
    if(!fs.existsSync(target)||!fs.statSync(target).size)errors.push(`${file}: recurso ausente ${ref}`);
  }
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  if(pages.includes(file)){
    for(const match of source.matchAll(/href="#([^"]+)"/g))if(!ids.includes(match[1]))errors.push(`${file}: âncora ausente ${match[1]}`);
    if(new Set(ids).size!==ids.length)errors.push(`${file}: IDs duplicados`);
    if(!source.includes('<main')||!source.includes('lang="pt-BR"'))errors.push(`${file}: estrutura semântica incompleta`);
  }
  if(source.includes('figma.com/api/mcp/asset'))errors.push(`${file}: URL temporária do Figma`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Verificação concluída: ${pages.length} páginas, ${art.length} figuras, recursos locais e âncoras válidos.`);
