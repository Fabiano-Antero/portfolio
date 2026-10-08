const fs=require('node:fs'),path=require('node:path');
const languageControl=`<div class="mobile-language mono"><button class="mobile-language-trigger" data-mobile-language type="button" aria-label="Idioma da página" aria-haspopup="listbox" aria-expanded="false" aria-controls="mobile-language-options"><span data-mobile-language-value data-no-translate>PT</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button><div id="mobile-language-options" class="mobile-language-options" role="listbox" aria-label="Idioma da página" hidden><button type="button" role="option" data-mobile-language-option="pt" lang="pt-BR" aria-selected="true">PT</button><button type="button" role="option" data-mobile-language-option="es" lang="es" aria-selected="false">ESP</button><button type="button" role="option" data-mobile-language-option="en" lang="en" aria-selected="false">ENG</button></div></div>`;
const hamburgerPaths=`<path d="M6 6H20"/><path d="M2 12H16"/><path d="M6 18H20"/>`;
const controls=languageControl+`<button class="mobile-menu-toggle" data-mobile-menu-toggle type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-navigation"><svg viewBox="0 0 24 24" aria-hidden="true">${hamburgerPaths}</svg></button>`;
function mobileHeader(html){
 const header=html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
 if(!header)return html;
 if(header.includes('data-mobile-language'))return html.replace(/<select class="mobile-language[^>]*>[\s\S]*?<\/select>/,languageControl).replace('<path d="M4 6H20"/><path d="M4 12H20"/><path d="M4 18H20"/>',hamburgerPaths);
 const home=header.includes('class="desktop-nav"');
 const nav=home?header.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/):header.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/);
 if(!nav)throw Error('Header navigation missing');
 let next=header;
 if(home)next=next.replace(/<a class="mobile-projects\b[^>]*>[\s\S]*?<\/a>/,'').replace(/<nav class="mobile-nav"[^>]*>[\s\S]*?<\/nav>/,'');
 else next=next.replace('<nav ','<nav class="case-navigation" ');
 next=next.replace(/<\/div>\s*<\/header>$/,`${controls}<nav id="mobile-navigation" class="mobile-nav mobile-menu-panel" aria-label="Navegação mobile" hidden>${nav[1]}</nav></div></header>`);
 return html.replace(header,next).replace('<script src="assets/js/app.js', '<script src="assets/js/mobile-navigation.js?v=20261008-mobile-header" defer></script><script src="assets/js/app.js')
  .replace('</head>','<noscript><style>@media(max-width:767px){.site-header .mobile-menu-panel[hidden]{display:flex!important}}</style></noscript></head>');
}
module.exports=mobileHeader;
if(require.main===module){
 const root=path.resolve(__dirname,'..');
 for(const file of ['index.html','projetos.html','ordiny.html','cash-advance.html','sandfit.html']){
  const filename=path.join(root,file);fs.writeFileSync(filename,mobileHeader(fs.readFileSync(filename,'utf8')));
 }
}
