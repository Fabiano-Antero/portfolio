// Sandfit Arena case, from Figma FjwyOTJe5Ym7kjnML55s22 / node 340:930.
// The four product screens remain native HTML artwork, as in the other cases.
const content=require('./sandfit-content.json');
module.exports=({section,heading,link,figure})=>{
 const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const text=id=>escape(content['343:'+id]||'').replaceAll('\n','<br>');
 const study='https://www.figma.com/design/VVbGZeoDwzTw4tbai6vHl9/Sandfit-arena?node-id=3422-6';
 const prototype='https://www.figma.com/design/VVbGZeoDwzTw4tbai6vHl9/Sandfit-arena?node-id=3471-2553';
 const chapters=[['contexto','01 Contexto'],['perfil','02 Perfil e critérios'],['jornada','03 Jornada'],['descoberta','04 Descoberta'],['reserva','05 Reserva'],['recuperacao','06 Recuperação'],['sistema','07 Sistema'],['encerramento','08 Encerramento']];
 const chapter=(id,paper,body)=>section(id,`sandfit-case${paper?' paper':''}`,body);
 const intro=(label,title,description)=>heading(text(label),text(title),text(description));
 const note=(label,title,body)=>`<article class="sandfit-note reveal"><p class="mono">${text(label)}</p><h3>${text(title)}</h3><p>${text(body)}</p></article>`;
 const grid=(columns,ids)=>`<div class="${columns===3?'three':'two'}-columns sandfit-notes">${ids.map(([label,title,body])=>note(label,title,body)).join('')}</div>`;
 const screen=(name,label,title)=>`<figure class="sandfit-screen reveal">${figure(name,390,844,title)}<figcaption class="mono">${text(label)}</figcaption></figure>`;
 const opening=section('','sandfit-case sandfit-intro',`<div class="case-opening sandfit-opening reveal">${link('projetos.html','← Todos os projetos','text-link')}<p class="eyebrow accent">${text(941)}</p><h1>${text(942)}</h1><h2 class="sandfit-thesis accent">${text(943)}</h2><p class="sandfit-description">${text(944)}</p><div class="sandfit-actions">${link(study,'Abrir estudo completo ↗')}${link(prototype,'Explorar protótipo ↗','button button-outline')}</div><nav class="sandfit-chapters" aria-label="Capítulos do estudo Sandfit Arena">${chapters.map(([id,label])=>link('#'+id,label,'chapter-link')).join('')}</nav></div>`);
 const showcase=section('','paper sandfit-showcase',`<figure class="sandfit-banner reveal">${figure('sandfit-banner',1280,720,'Sandfit Arena: areia no treino, clareza na reserva')}</figure>`);
 const facts=`<section class="sandfit-facts"><div class="container three-columns">${[[1006,1007,1008],[1010,1011,1012],[1014,1015,1016]].map(([label,title,body])=>note(label,title,body)).join('')}</div></section>`;
 const context=chapter('contexto',true,intro(1018,1019,1020)+'<hr>'+grid(2,[[1024,1025,1026],[1028,1029,1030]]));
 const profile=chapter('perfil',false,intro(1032,1033,1034)+grid(3,[[1037,1038,1039],[1041,1042,1043],[1045,1046,1047]]));
 const journey=chapter('jornada',true,intro(1049,1050,1051)+`<ol class="sandfit-flow">${[[1054,1055,1056],[1058,1059,1060],[1062,1063,1064],[1066,1067,1068]].map(([number,title,body])=>`<li class="reveal"><p class="mono">${text(number)}</p><h3>${text(title)}</h3><p>${text(body)}</p></li>`).join('')}</ol><hr>`+grid(2,[[1072,1073,1074],[1076,1077,1078]]));
 const discovery=chapter('descoberta',false,intro(1080,1081,1082)+`<div class="sandfit-screen-grid">${screen('sandfit-home',1175,'Sandfit: home com próximo treino, créditos e acesso à reserva')}${screen('sandfit-agenda',1263,'Sandfit: agenda com dias, filtros, horários e disponibilidade')}</div><hr>`+grid(2,[[1267,1268,1269],[1271,1272,1273]]));
 const booking=chapter('reserva',true,intro(1275,1276,1277)+`<div class="sandfit-screen-grid">${screen('sandfit-spot',1363,'Sandfit: mapa com posições livres, ocupadas e selecionadas')}${screen('sandfit-review',1428,'Sandfit: revisão da reserva, crédito, saldo e prazo de cancelamento')}</div><hr>`+grid(2,[[1432,1433,1434],[1436,1437,1438]]));
 const recovery=chapter('recuperacao',false,intro(1440,1441,1442)+grid(3,[[1445,1446,1447],[1449,1450,1451],[1453,1454,1455]]));
 const system=chapter('sistema',true,intro(1457,1458,1459)+`<div class="sandfit-palette reveal">${[[1463,1464],[1467,1468],[1471,1472],[1475,1476],[1479,1480],[1483,1484]].map(([label,color])=>`<div><span style="background:${text(color)}" aria-hidden="true"></span><p class="label">${text(label)}</p><p class="mono">${text(color)}</p></div>`).join('')}</div><hr>`+grid(3,[[1488,1489,1490],[1492,1493,1494],[1496,1497,1498]]));
 const closing=chapter('encerramento',false,intro(1500,1501,1502)+`<p class="sandfit-description reveal">${text(1503)}</p><div class="sandfit-actions reveal">${link(study,'Consultar estudo completo ↗')}${link('projetos.html','Voltar aos projetos','button button-outline')}</div>`);
 return opening+showcase+facts+context+profile+journey+discovery+booking+recovery+system+closing;
};
