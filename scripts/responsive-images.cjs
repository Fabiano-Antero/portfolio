const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/data/image-variants.json'),'utf8'));
module.exports=html=>html.replace(/<img\b[^>]*>/g,tag=>{
  const source=tag.match(/\bsrc="([^"]+)"/)?.[1],entry=manifest[source];
  if(!entry)return tag;
  const width=Number(tag.match(/\bwidth="(\d+)"/)?.[1]);
  const sizes=width&&width<=400?`${width}px`:'(max-width: 767px) calc(100vw - 40px), (max-width: 1440px) calc(50vw - 80px), 640px';
  tag=tag.replace(/\bsrc="[^"]+"/,`src="${entry.src}"`).replace(/\s+(?:srcset|sizes)="[^"]*"/g,'');
  return tag.replace(/>$/,` srcset="${entry.variants.map(image=>`${image.src} ${image.width}w`).join(', ')}" sizes="${sizes}">`);
});
