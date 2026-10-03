export const normalizeQuestion=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const includes=(question,term)=>` ${question} `.includes(` ${normalizeQuestion(term)} `);
export const isConversationEnding=question=>/^(?:(?:obrigad[oa]|valeu|thanks|thank you) )?(?:(?:eu )?nao (?:tenho|tem|ha|quero fazer) (?:nenhuma )?mais perguntas?|nao tenho (?:nenhuma )?(?:outra|outras) perguntas?|sem mais perguntas?|nao (?:quero|preciso) perguntar mais|(?:era |e )?so isso|por enquanto e isso|no more questions|i (?:have no more questions|am done|m done)|that (?:s|is) all|thats all|all done)(?: por (?:agora|enquanto)| obrigado| obrigada| valeu| thanks| thank you)?$/.test(normalizeQuestion(question));

// Answers are selected only from the authored knowledge base. No outside
// service receives a visitor's question and unknown facts are not generated.
export function findCharacterAnswer(question,knowledge,previousTopic='') {
  const q=normalizeQuestion(question);
  if(!q)return {type:'empty'};
  const has=terms=>terms.some(term=>includes(q,term));
  if(has(['salario','salarios','salario pretendido','idade','aniversario','nascimento','filhos','casado','endereco residencial','salary','age','birthday','children','married','home address']))return {type:'unknown'};
  if(/^(oi|ola|hey|hi|hello|bom dia|boa tarde|boa noite)$/.test(q))return {type:'greeting'};
  if(/^(obrigad[oa]|valeu|thanks|thank you)$/.test(q))return {type:'thanks'};
  const topics=knowledge.topics;
  const topic=id=>({type:'topic',ids:[id]});
  const namedContext=has(['ordiny','cash','lumen','aqui limpa','dadoteca','lifter','lifters','tbanks','tbank','tivit','conpay','energisa']);
  const ordiny=has(['ordiny'])||(!namedContext&&previousTopic.startsWith('ordiny'));
  if(ordiny&&has(['stack','tecnologia','tecnologias','arquitetura','ferramentas','technology','technologies','tools','architecture','react','typescript']))return topic('ordiny-build');
  if(ordiny&&has(['whatsapp','chatbot','automacao','ia','ai','automation']))return topic('ordiny-whatsapp');
  if(ordiny&&has(['stripe','pagamento','pagamentos','assinatura','payment','payments','subscription']))return topic('ordiny-payments');
  if(ordiny&&has(['disponibilidade','reserva','reservas','profissionais','availability','booking rules']))return topic('ordiny-booking');
  const cash=has(['cash','cash advance'])||(!namedContext&&previousTopic.startsWith('cash'));
  if(cash&&has(['resultado','resultados','pesquisa','validacao','research','results','validation','metricas']))return topic('cash-validation');
  if(cash&&has(['cores','sistema visual','identidade','colors','visual system','identity']))return topic('cash-system');
  const named=['dadoteca','lifter','tbanks','conpay','energisa','ordiny','cash','lumen','aqui-limpa','interests','resume'];
  const ranked=topics.map(entry=>{
    const matches=entry.keywords.filter(word=>includes(q,word));
    const longest=Math.max(0,...matches.map(word=>normalizeQuestion(word).split(' ').length));
    return {id:entry.id,score:matches.length?longest*5+Math.min(matches.length,4)*2+(named.includes(entry.id)?2:0):0};
  }).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score);
  if(!ranked.length)return {type:'unknown'};
  return topic(ranked[0].id);
}
