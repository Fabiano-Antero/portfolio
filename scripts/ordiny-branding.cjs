const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function updateMarkup(html){
 const node=html.indexOf('data-node-id="237:1203"');
 if(node<0)throw new Error('Meta brand position was not found in the Ordiny artwork.');
 const start=html.lastIndexOf('<div',node);
 const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;
 let depth=0,end;
 for(let match;(match=tags.exec(html));){depth+=match[0].startsWith('</')?-1:1;if(depth===0){end=tags.lastIndex;break;}}
 if(!end)throw new Error('Incomplete Meta brand markup.');
 // Fit the supplied transparent symbol using its alpha bounds (4,77)-(508,413).
 // This preserves its proportions without editing the original image or masks.
 const logo='<div data-node-id="237:1203" data-brand="meta" style="height:28.233px;position:relative;flex-shrink:0;width:139.425px">'+
 '<img src="../figma/o1-imgWordmark.svg" alt="Meta" style="position:absolute;left:36.71%;top:3.21%;width:63.29%;height:96.75%;max-width:none">'+
 '<span style="position:absolute;left:0;top:0;width:42.28px;height:28.233px;overflow:hidden">'+
 '<img src="../img/meta-symbol.webp" alt="" aria-hidden="true" width="512" height="512" style="position:absolute;left:-0.336px;top:-6.436px;width:42.951px;height:42.951px;max-width:none"></span></div>';
 return html.slice(0,start)+logo+html.slice(end);
}
function build(){
 const file=path.join(root,'assets/art/ordiny-product.html'),html=fs.readFileSync(file,'utf8');
 const updated=updateMarkup(html);if(updated!==html)fs.writeFileSync(file,updated);
}
module.exports=build;module.exports.updateMarkup=updateMarkup;
if(require.main===module)build();
