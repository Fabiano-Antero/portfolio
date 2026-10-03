const fs=require('node:fs');
const path=require('node:path');
const corrections=[
 ['Descomplicando o cotidianno','Descomplicando o cotidiano'],
 ['Visualise todos os agendamento em um só lugar','Visualize todos os agendamentos em um só lugar'],
 ['78% da  agenda do dia','78% da agenda do dia'],
 ['Olá ana, seu horário é','Olá, Ana! Seu horário é'],
 ['amanhã as 10:30h','amanhã às 10h30.'],
 ['Julia Nogeuira','Júlia Nogueira'],
 ['Embreve','Em breve'],
 ['R$60','R$ 60'],
 ['Próximos Horários','Próximos horários'],
 ['Próximo Atendimento','Próximo atendimento'],
 ['Limite Disponível','Limite disponível']
];
function reviewArtHtml(html){
 return html.replace(/>([^<>]+)</g,(_,value)=>{
  let text=value;
  for(const [before,after] of corrections)text=text.replaceAll(before,after);
  if(text.trim()==='Don')text=text.replace('Don','Dom');
  return '>'+text+'<';
 });
}
function reviewSavedArt(root){
 const directory=path.join(root,'assets/art');
 for(const name of fs.readdirSync(directory).filter(name=>name.endsWith('.html'))){
  const file=path.join(directory,name),source=fs.readFileSync(file,'utf8'),reviewed=reviewArtHtml(source);
  if(reviewed!==source)fs.writeFileSync(file,reviewed);
 }
}
module.exports={reviewArtHtml,reviewSavedArt};
