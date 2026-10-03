import {findCharacterAnswer,isConversationEnding} from './chibi-answers.js';

const copy={
  pt:{invite:'Oi! Quer saber um pouco sobre mim?',yes:'Sim',no:'Não',title:'Converse com o Fabiano',subtitle:'Carreira, projetos e um pouco de mim.',open:'Conversar',close:'Fechar conversa',label:'Sua pergunta',placeholder:'O que você quer saber?',send:'Enviar',welcome:'Pode perguntar! Quer conhecer minha trajetória, meus projetos ou o que gosto de fazer?',unknown:'Ainda não tenho essa informação sobre mim. Posso contar sobre minha carreira, formação, competências, projetos e hobbies. Para outros detalhes, podemos conversar pelos canais de contato.',greeting:'Oi! É bom ter você por aqui. O que quer saber sobre minha carreira, meus projetos ou meus hobbies?',thanks:'Por nada! Se quiser, podemos conversar sobre outro projeto ou sobre minha trajetória.',loading:'Um instante…',error:'Não consegui carregar minhas respostas. Tente enviar sua pergunta novamente.',suggestions:['Quem é você?','Conte sobre a Ordiny','Quais são seus hobbies?'],you:'Você',avatar:'Fabiano',limit:'Escreva uma pergunta com até 350 caracteres.'},
  en:{invite:'Hi! Would you like to know a little about me?',yes:'Yes',no:'No',title:'Chat with Fabiano',subtitle:'Career, projects and a little about me.',open:'Chat',close:'Close conversation',label:'Your question',placeholder:'What would you like to know?',send:'Send',welcome:'Ask away! Would you like to hear about my career, projects or what I enjoy doing?',unknown:"I don't have that information about myself yet. I can tell you about my career, education, skills, projects and hobbies. For other details, let's talk through the contact channels.",greeting:'Hi! Glad to have you here. What would you like to know about my career, projects or hobbies?',thanks:"You're welcome! We can talk about another project or my experience if you'd like.",loading:'One moment…',error:"I couldn't load my answers. Please try sending your question again.",suggestions:['Who are you?','Tell me about Ordiny','What are your hobbies?'],you:'You',avatar:'Fabiano',limit:'Write a question with up to 350 characters.'}
};
const read=(key,fallback)=>{try{return JSON.parse(sessionStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
const button=(className,text,handler)=>{const node=element('button',className,text);node.type='button';node.addEventListener('click',handler);return node;};

export function createCharacterChat(container,{onOpen=()=>{},onClose=()=>{}}={}) {
  let language=document.documentElement.lang==='en'?'en':'pt',knowledge,loadPromise;
  let opened=false,alive=true,busy=false,characterState='idle',inviteTimer;
  let messages=read('portfolio-chibi-messages',[]);
  if(!Array.isArray(messages))messages=[];
  messages=messages.filter(message=>message&&['visitor','answer'].includes(message.role)&&typeof message.text==='string'&&(!message.answer?.ids||Array.isArray(message.answer.ids))).slice(-32);
  let previousTopic=messages.filter(message=>message.role==='answer').at(-1)?.answer?.ids?.[0]||'';
  const root=element('div','chibi-chat');root.dataset.noTranslate='';
  const launcher=button('chibi-chat-launcher','',()=>open());launcher.hidden=true;
  const invite=element('section','chibi-chat-invite');invite.hidden=true;
  const inviteText=element('p');const choices=element('div','chibi-chat-choices');
  const yes=button('chibi-chat-primary','',()=>open());
  const no=button('chibi-chat-secondary','',()=>{save('portfolio-chibi-invite-seen',true);invite.hidden=true;launcher.hidden=false;});
  choices.append(yes,no);invite.append(inviteText,choices);
  const panel=element('section','chibi-chat-panel');panel.hidden=true;
  panel.id='chibi-conversation';panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','chibi-chat-title');
  const header=element('div','chibi-chat-header');
  const titles=element('div');const title=element('h2');title.id='chibi-chat-title';const subtitle=element('p');titles.append(title,subtitle);
  const close=button('chibi-chat-dismiss','×',()=>closeChat());header.append(titles,close);
  const log=element('div','chibi-chat-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');
  const suggestions=element('div','chibi-chat-suggestions');
  const form=element('form','chibi-chat-form');const label=element('label');label.htmlFor='chibi-question';
  const input=element('input');input.id='chibi-question';input.name='question';input.type='text';input.maxLength=350;input.required=true;input.autocomplete='off';
  const row=element('div','chibi-chat-input-row');const send=element('button','chibi-chat-primary');send.type='submit';
  row.append(input,send);const status=element('p','chibi-chat-status');status.setAttribute('role','status');
  form.append(label,row,status);panel.append(header,log,suggestions,form);root.append(launcher,invite,panel);container.append(root);
  launcher.setAttribute('aria-controls',panel.id);yes.setAttribute('aria-controls',panel.id);
  const load=()=>{
    if(knowledge)return Promise.resolve(knowledge);
    if(!loadPromise)loadPromise=fetch(new URL('../data/fabiano.json',import.meta.url)).then(response=>{if(!response.ok)throw Error('Knowledge unavailable');return response.json();}).then(data=>{if(!Array.isArray(data.topics))throw Error('Invalid knowledge');knowledge=data;return data;}).catch(error=>{loadPromise=undefined;throw error;});
    return loadPromise;
  };
  const safeLink=url=>{try{const parsed=new URL(url,location.href);return ['https:','mailto:'].includes(parsed.protocol)||(parsed.origin===location.origin&&parsed.protocol===location.protocol);}catch{return false;}};
  const answerText=message=>{
    if(message.role==='visitor')return message.text;
    if(message.answer?.type==='topic'&&knowledge)return message.answer.ids.map(id=>knowledge.topics.find(topic=>topic.id===id)?.answer[language]).filter(Boolean).join('\n\n')||copy[language].unknown;
    return copy[language][message.answer?.type]||message.text;
  };
  const appendMessage=message=>{
    const bubble=element('article',`chibi-chat-bubble chibi-chat-${message.role}`);
    const name=element('span','chibi-chat-speaker',copy[language][message.role==='visitor'?'you':'avatar']);
    const text=element('p',null,answerText(message));bubble.append(name,text);
    if(message.role==='answer'&&knowledge&&message.answer?.ids){
      const links=element('div','chibi-chat-links');
      for(const id of message.answer.ids)for(const item of knowledge.topics.find(topic=>topic.id===id)?.links||[]){
        if(!safeLink(item.url))continue;
        const anchor=element('a',null,item[language]);anchor.href=item.url;
        if(item.url.startsWith('https:')){anchor.target='_blank';anchor.rel='noopener noreferrer';}
        links.append(anchor);
      }
      if(links.childElementCount)bubble.append(links);
    }
    log.append(bubble);log.scrollTop=log.scrollHeight;
  };
  const renderLog=()=>{log.replaceChildren();for(const message of messages)appendMessage(message);};
  const add=message=>{messages.push(message);if(messages.length>32){messages=messages.slice(-32);renderLog();}else appendMessage(message);save('portfolio-chibi-messages',messages);};
  const setBusy=value=>{busy=value;send.disabled=value;form.setAttribute('aria-busy',String(value));status.textContent=value?copy[language].loading:'';};
  const ask=async question=>{
    if(busy||!alive)return;
    const text=question.trim();if(!text)return;
    if(text.length>350){status.textContent=copy[language].limit;return;}
    if(isConversationEnding(text)){input.value='';closeChat();return;}
    setBusy(true);
    try{
      const data=await load();if(!alive)return;
      add({role:'visitor',text});input.value='';
      const answer=findCharacterAnswer(text,data,previousTopic);
      previousTopic=answer.ids?.[0]||previousTopic;
      const response=answer.type==='topic'?data.topics.find(topic=>topic.id===answer.ids[0]).answer[language]:copy[language][answer.type];
      add({role:'answer',text:response||copy[language].unknown,answer});
      suggestions.hidden=true;setBusy(false);input.focus({preventScroll:true});
    }catch{if(alive){setBusy(false);status.textContent=copy[language].error;}}
  };
  form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
  const fit=()=>{
    const viewport=window.visualViewport;
    const height=viewport?.height||innerHeight,keyboard=Math.max(0,innerHeight-height-(viewport?.offsetTop||0));
    root.style.setProperty('--chat-viewport-height',`${height}px`);
    root.style.setProperty('--chat-bottom',keyboard>100?`${keyboard+12}px`:'');
    root.classList.toggle('chibi-chat-keyboard',keyboard>100);
  };
  function open(){
    opened=true;clearTimeout(inviteTimer);save('portfolio-chibi-invite-seen',true);
    invite.hidden=true;launcher.hidden=true;panel.hidden=false;launcher.setAttribute('aria-expanded','true');
    onOpen();
    if(!messages.length)add({role:'answer',text:copy[language].welcome,answer:{type:'welcome'}});
    renderLog();fit();input.focus({preventScroll:true});
    load().then(()=>{if(alive)renderLog();}).catch(()=>{});
  }
  function closeChat(){opened=false;panel.hidden=true;invite.hidden=true;launcher.hidden=characterState!=='idle';launcher.setAttribute('aria-expanded','false');onClose();if(!launcher.hidden)launcher.focus({preventScroll:true});}
  const translate=()=>{
    const statusKey=['error','limit'].find(key=>status.textContent===copy[language][key]);
    language=document.documentElement.lang==='en'?'en':'pt';const text=copy[language];
    inviteText.textContent=text.invite;invite.setAttribute('aria-label',text.invite);yes.textContent=text.yes;no.textContent=text.no;
    launcher.textContent=text.open;launcher.setAttribute('aria-label',text.title);title.textContent=text.title;subtitle.textContent=text.subtitle;
    close.setAttribute('aria-label',text.close);label.textContent=text.label;input.placeholder=text.placeholder;send.textContent=text.send;
    if(busy)status.textContent=text.loading;
    else if(statusKey)status.textContent=text[statusKey];
    suggestions.replaceChildren(...text.suggestions.map(question=>button('chibi-chat-suggestion',question,()=>ask(question))));
    renderLog();
  };
  const keyboard=event=>{if(event.key==='Escape'&&opened){event.preventDefault();event.stopPropagation();closeChat();}};
  root.addEventListener('keydown',keyboard);
  document.addEventListener('portfolio:language',translate);
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
  translate();fit();
  const setCharacterState=state=>{
    characterState=state;clearTimeout(inviteTimer);
    if(state!=='idle'){invite.hidden=true;launcher.hidden=true;return;}
    if(opened)return;
    if(read('portfolio-chibi-invite-seen',false)){launcher.hidden=false;return;}
    inviteTimer=setTimeout(()=>{if(alive&&!opened&&characterState==='idle')invite.hidden=false;},60_000);
  };
  setCharacterState('idle');
  return {
    get isOpen(){return opened;},setCharacterState,
    destroy(){alive=false;clearTimeout(inviteTimer);document.removeEventListener('portfolio:language',translate);window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('scroll',fit);root.remove();}
  };
}
