'use strict';
/** Online signaling adapter. No camera/audio APIs, cookies or localStorage. */
window.VozOnline=(()=>{
  function base(){
    const value=window.VozOnlineConfig?.apiBase;if(!value)throw Object.assign(new Error('NOT_CONFIGURED'),{code:'NOT_CONFIGURED'});
    let url;try{url=new URL(value);}catch{throw Object.assign(new Error('NOT_CONFIGURED'),{code:'NOT_CONFIGURED'});}
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Object.assign(new Error('HTTPS_REQUIRED'),{code:'HTTPS_REQUIRED'});
    return url.origin;
  }
  async function api(path,data,password,keepalive=false){
    let response;try{response=await fetch(base()+path,{method:'POST',headers:{'Content-Type':'application/json',...(password?{Authorization:'Bearer '+password}:{})},body:JSON.stringify(data||{}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:keepalive?undefined:AbortSignal.timeout(15000),keepalive});}
    catch(e){if(e.code)throw e;throw Object.assign(new Error('NETWORK'),{code:'NETWORK'});}
    const result=await response.json().catch(()=>({error:'SERVER_ERROR'}));
    if(!response.ok)throw Object.assign(new Error(result.error||'SERVER_ERROR'),{code:result.error||'SERVER_ERROR',status:response.status});return result;
  }
  class Signal {
    constructor({room,token,role,clientId,onState}){
      Object.assign(this,{room,token,role,clientId,onState,onmessage:null,socket:null,closed:false,ready:false,attempt:0,epoch:0,retryTimer:null,ping:null,rtcConfig:null});
    }
    async open(){
      const epoch=++this.epoch;this.onState?.('connecting');
      const data=await api(`/v1/rooms/${this.room}/join`,{token:this.token,role:this.role,clientId:this.clientId});
      if(this.closed||epoch!==this.epoch)throw Object.assign(new Error('CANCELLED'),{code:'CANCELLED'});
      this.rtcConfig={iceServers:data.iceServers,bundlePolicy:'max-bundle'};this.relayAvailable=data.relayAvailable;
      const url=new URL(base()+`/v1/rooms/${this.room}/socket`);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',data.ticket);
      await new Promise((resolve,reject)=>{
        const ws=new WebSocket(url.href);this.socket=ws;let opened=false;
        const timer=setTimeout(()=>{ws.close();reject(Object.assign(new Error('NETWORK'),{code:'NETWORK'}));},12000);
        ws.onmessage=e=>{
          if(this.closed||epoch!==this.epoch)return;let m;try{m=JSON.parse(e.data);}catch{return;}
          if(m.from==='server'&&m.type==='ready'){
            opened=true;clearTimeout(timer);this.ready=true;this.attempt=0;
            this.onState?.('connected');resolve();
            clearInterval(this.ping);this.ping=setInterval(()=>this.postMessage({v:15,type:'ping'}),20000);return;
          }
          if(m.from==='server')return;this.onmessage?.({data:m});
        };
        ws.onerror=()=>{};
        ws.onclose=e=>{
          clearTimeout(timer);if(this.closed||epoch!==this.epoch)return;this.ready=false;clearInterval(this.ping);
          if(!opened){reject(Object.assign(new Error('NETWORK'),{code:'NETWORK'}));return;}
          if([4000,4001,1008,1009].includes(e.code)){this.closed=true;this.onState?.('ended',e.code===4000?'ROOM_ENDED':'CONNECTION_REJECTED');return;}
          this.onState?.('reconnecting');this.schedule();
        };
      });
    }
    schedule(){
      if(this.closed)return;clearTimeout(this.retryTimer);
      this.retryTimer=setTimeout(()=>this.open().catch(e=>{
        if(this.closed)return;
        if(['ROOM_ENDED','AUTH_REQUIRED','PUBLISHER_EXISTS','VIEWER_LIMIT'].includes(e.code)){this.closed=true;this.onState?.('ended',e.code);}
        else{this.onState?.('reconnecting',e.code);this.schedule();}
      }),Math.min(12000,700*2**Math.min(this.attempt++,4))+Math.random()*250);
    }
    postMessage(m){if(this.ready&&this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(m));}
    close(){this.closed=true;this.ready=false;this.epoch++;clearTimeout(this.retryTimer);clearInterval(this.ping);this.socket?.close(1000,'client-close');this.socket=null;}
  }
  return Object.freeze({
    configured:()=>{try{return !!base();}catch{return false;}},
    create:password=>api('/v1/rooms',{},password),
    end:(room,token)=>api(`/v1/rooms/${room}/end`,{token},null,true).catch(()=>{}),
    Signal,
    parseLink:()=>{const q=new URLSearchParams(location.hash.slice(1));const room=q.get('room'),token=q.get('key');return /^[a-f0-9]{32}$/.test(room||'')&&/^[a-f0-9]{64}$/.test(token||'')?{room,token}:null;}
  });
})();
