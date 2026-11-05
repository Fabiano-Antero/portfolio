import { DurableObject } from 'cloudflare:workers';
/** AI_APRE v15. Signaling only: no recording and no media through this Worker.
 * Tokens stay out of URLs except single-use, 30-second WebSocket tickets.
 * Media: browser-to-browser WebRTC, with short-lived Cloudflare TURN fallback.
 */
const ROOM_MS = 6 * 60 * 60 * 1000;
const MAX_VIEWERS = 4;
const ID = /^[a-f0-9]{32}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const enc = new TextEncoder();
const json = (data, status=200) => Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error = (code, status=400) => json({error:code},status);
function random(n=32) {return Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');}
async function hash(value) {return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));}
// Fixed-length, constant-work comparison of SHA-256 digests.
async function equal(value, digest) {const a=await hash(value),b=new Uint8Array(digest);let d=a.length^b.length;for(let i=0;i<32;i++)d|=a[i]^(b[i]||0);return d===0;}
async function body(request, max=8192) {
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new Error('BAD_BODY');
  const reader=request.body?.getReader();if(!reader)throw new Error('BAD_BODY');
  let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  let value;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error('BAD_BODY');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('BAD_BODY');return value;
}
function cors(response, origin) {
  if(response.status===101)return response;
  const r=new Response(response.body,response);r.headers.set('Access-Control-Allow-Origin',origin);r.headers.set('Vary','Origin');
  r.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');r.headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  r.headers.set('Access-Control-Max-Age','600');r.headers.set('Cache-Control','no-store');return r;
}
async function call(stub,path,data) {return stub.fetch(new Request('https://internal/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}));}
function allowed(request,env) {const origin=request.headers.get('Origin');return origin&&(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).includes(origin)?origin:null;}
export default {
  async fetch(request,env) {
    const url=new URL(request.url),origin=allowed(request,env);
    if(url.pathname==='/health'&&request.method==='GET')return json({service:'ai-apre-signal',version:15,configured:!!env.PUBLISH_PASSWORD&&env.PUBLISH_PASSWORD.length>=16&&!env.PUBLISH_PASSWORD.startsWith('REPLACE_')&&!!env.ROOMS&&!!env.AUTH_GUARD,relayConfigured:!!env.TURN_KEY_ID&&!!env.TURN_API_TOKEN});
    if(!origin)return error('ORIGIN_NOT_ALLOWED',403);
    if(request.method==='OPTIONS')return cors(new Response(null,{status:204}),origin);
    try {
      if(!env.ROOMS||!env.AUTH_GUARD||!env.PUBLISH_PASSWORD||env.PUBLISH_PASSWORD.length<16||env.PUBLISH_PASSWORD.startsWith('REPLACE_'))return cors(error('SERVER_NOT_CONFIGURED',503),origin);
      if(url.pathname==='/v1/rooms'&&request.method==='POST') {
        // Per-IP + global creation limits live in a separate Durable Object.
        const ipHash=Array.from(await hash(request.headers.get('CF-Connecting-IP')||'local'),x=>x.toString(16).padStart(2,'0')).join('');
        const guard=env.AUTH_GUARD.getByName('publisher-auth');
        const permit=await call(guard,'attempt',{ipHash});if(!permit.ok)return cors(permit,origin);
        const password=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
        if(password.length>256||!await equal(password,await hash(env.PUBLISH_PASSWORD)))return cors(error('AUTH_REQUIRED',401),origin);
        if(env.REQUIRE_TURN!=='false'&&(!env.TURN_KEY_ID||!env.TURN_API_TOKEN))return cors(error('TURN_NOT_CONFIGURED',503),origin);
        const room=random(16),publisherToken=random(),viewerToken=random(),expiresAt=Date.now()+ROOM_MS;
        const result=await call(env.ROOMS.getByName(room),'init',{pubHash:Array.from(await hash(publisherToken)),viewHash:Array.from(await hash(viewerToken)),expiresAt});
        if(!result.ok)return cors(result,origin);
        return cors(json({room,publisherToken,viewerToken,expiresAt,maxViewers:MAX_VIEWERS},201),origin);
      }
      const m=url.pathname.match(/^\/v1\/rooms\/([a-f0-9]{32})\/(join|socket|end)$/);
      if(!m)return cors(error('NOT_FOUND',404),origin);
      const stub=env.ROOMS.getByName(m[1]);
      if(m[2]==='socket'&&request.method==='GET'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket') {
        const ticket=url.searchParams.get('ticket');if(!TOKEN.test(ticket||''))return cors(error('INVALID_TICKET',401),origin);
        return cors(await stub.fetch(new Request('https://internal/socket?ticket='+ticket,{headers:{Upgrade:'websocket'}})),origin);
      }
      if(request.method!=='POST')return cors(error('METHOD_NOT_ALLOWED',405),origin);
      const data=await body(request);
      return cors(await call(stub,m[2],data),origin);
    } catch(e) {
      if(['BAD_BODY','BODY_TOO_LARGE'].includes(e.message))return cors(error(e.message,400),origin);
      console.error(JSON.stringify({event:'request-failed',name:e.name}));return cors(error('SERVER_ERROR',500),origin);
    }
  }
};
/** Persisted admission limits. Only hashes of IPs are stored, for <= 15 minutes. */
export class AuthGuard extends DurableObject {
  async fetch(request) {
    const {ipHash}=await body(request);if(!/^[a-f0-9]{64}$/.test(ipHash||''))return error('BAD_REQUEST');
    return this.ctx.blockConcurrencyWhile(async()=>{
      const now=Date.now(),window=Math.floor(now/600000),key='ip:'+ipHash;
      let local=await this.ctx.storage.get(key),global=await this.ctx.storage.get('global');
      if(!local||local.window!==window)local={window,count:0};if(!global||global.window!==window)global={window,count:0};
      if(local.count>=12||global.count>=120)return error('RATE_LIMIT',429);
      local.count++;global.count++;await this.ctx.storage.put({[key]:local,global});
      if(!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(now+900000);return json({ok:true});
    });
  }
  async alarm(){await this.ctx.storage.deleteAll();}
}
export class Room extends DurableObject {
  constructor(ctx,env) {super(ctx,env);this.meta=null;ctx.blockConcurrencyWhile(async()=>{this.meta=await ctx.storage.get('meta');});}
  sockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
  info(ws){try{return ws.deserializeAttachment();}catch{return null;}}
  send(ws,msg){try{if(ws.readyState===1)ws.send(JSON.stringify(msg));}catch{}}
  forward(msg,role,id=null,except=null){for(const ws of this.sockets()){const s=this.info(ws);if(ws!==except&&s?.role===role&&(!id||s.id===id))this.send(ws,msg);}}
  async fetch(request) {
    const url=new URL(request.url);
    if(url.pathname==='/init')return this.ctx.blockConcurrencyWhile(async()=>{
      if(this.meta)return error('ALREADY_EXISTS',409);const data=await body(request);
      await this.ctx.storage.put('meta',data);this.meta=data;await this.ctx.storage.setAlarm(data.expiresAt);return json({ok:true});
    });
    if(!this.meta||this.meta.closed||Date.now()>=this.meta.expiresAt)return error('ROOM_ENDED',410);
    if(url.pathname==='/socket')return this.upgrade(url.searchParams.get('ticket'));
    const data=await body(request);
    if(!TOKEN.test(data.token||''))return error('AUTH_REQUIRED',401);
    if(url.pathname==='/end') {
      if(!await equal(data.token,this.meta.pubHash))return error('AUTH_REQUIRED',401);
      await this.finish();return json({ok:true});
    }
    if(url.pathname!=='/join')return error('NOT_FOUND',404);
    if(!['publisher','viewer'].includes(data.role)||!ID.test(data.clientId||''))return error('BAD_REQUEST');
    if(!await equal(data.token,data.role==='publisher'?this.meta.pubHash:this.meta.viewHash))return error('AUTH_REQUIRED',401);
    // Cache credentials per participant, never the long-lived TURN secret in the browser.
    return this.ctx.blockConcurrencyWhile(async()=>{
      if(this.meta.closed)return error('ROOM_ENDED',410);
      const now=Date.now(),counter=await this.ctx.storage.get('joins')||{at:now,n:0};
      if(now-counter.at>60000){counter.at=now;counter.n=0;}if(++counter.n>40)return error('RATE_LIMIT',429);await this.ctx.storage.put('joins',counter);
      const all=this.sockets(),same=all.find(ws=>{const s=this.info(ws);return s?.role===data.role&&s.id===data.clientId;});
      if(!same&&data.role==='viewer'&&all.filter(ws=>this.info(ws)?.role==='viewer').length>=MAX_VIEWERS)return error('VIEWER_LIMIT',409);
      if(!same&&data.role==='publisher'&&all.some(ws=>this.info(ws)?.role==='publisher'))return error('PUBLISHER_EXISTS',409);
      const key='ice:'+data.role+':'+data.clientId;
      let ice=await this.ctx.storage.get(key);
      if(!ice){
        const total=await this.ctx.storage.get('unique-clients')||0;
        if(total>=64)return error('SESSION_LIMIT',429);
        await this.ctx.storage.put('unique-clients',total+1);
      }
      if(!ice||ice.expiresAt<now+60000){
        if(this.env.TURN_KEY_ID&&this.env.TURN_API_TOKEN){
          const ttl=Math.max(60,Math.ceil((this.meta.expiresAt-now)/1000)+300);
          let res;try{res=await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(this.env.TURN_KEY_ID)}/credentials/generate-ice-servers`,{method:'POST',headers:{Authorization:'Bearer '+this.env.TURN_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({ttl}),signal:AbortSignal.timeout(8000)});}catch{return error('TURN_UNAVAILABLE',503);}
          if(!res.ok)return error('TURN_UNAVAILABLE',503);const result=await res.json();
          if(!Array.isArray(result.iceServers))return error('TURN_UNAVAILABLE',503);
          const iceServers=result.iceServers.map(s=>({...s,urls:(Array.isArray(s.urls)?s.urls:[s.urls]).filter(u=>typeof u==='string'&&!/:53(?:\?|$)/.test(u))})).filter(s=>s.urls.length);
          if(!iceServers.some(s=>s.urls.some(u=>u.startsWith('turn:')||u.startsWith('turns:'))))return error('TURN_UNAVAILABLE',503);
          ice={iceServers,expiresAt:now+ttl*1000,relayAvailable:true};
        }else{
          if(this.env.REQUIRE_TURN!=='false')return error('TURN_NOT_CONFIGURED',503);
          ice={iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],expiresAt:this.meta.expiresAt,relayAvailable:false};
        }
        await this.ctx.storage.put(key,ice);
      }
      // One outstanding ticket per client. Reissuing invalidates the previous one.
      const old=await this.ctx.storage.get('client-ticket:'+data.clientId);if(old)await this.ctx.storage.delete('ticket:'+old);
      const ticket=random();await this.ctx.storage.put({['ticket:'+ticket]:{role:data.role,id:data.clientId,expires:now+30000},['client-ticket:'+data.clientId]:ticket});
      return json({ticket,...ice,roomExpiresAt:this.meta.expiresAt,maxViewers:MAX_VIEWERS});
    });
  }
  async upgrade(ticket) {
    return this.ctx.blockConcurrencyWhile(async()=>{
      const s=await this.ctx.storage.get('ticket:'+ticket);await this.ctx.storage.delete('ticket:'+ticket);
      if(!s||s.expires<Date.now()||this.meta?.closed)return error('INVALID_TICKET',401);
      const peers=this.sockets(),same=peers.filter(ws=>{const a=this.info(ws);return a?.id===s.id&&a.role===s.role;});
      if(s.role==='viewer'&&peers.filter(ws=>this.info(ws)?.role==='viewer'&&!same.includes(ws)).length>=MAX_VIEWERS)return error('VIEWER_LIMIT',409);
      if(s.role==='publisher'&&peers.some(ws=>this.info(ws)?.role==='publisher'&&!same.includes(ws)))return error('PUBLISHER_EXISTS',409);
      const [client,server]=Object.values(new WebSocketPair());
      s.bucket=100;s.last=Date.now();this.ctx.acceptWebSocket(server,[s.role,s.id]);server.serializeAttachment(s);
      for(const ws of same){try{ws.close(4001,'replaced');}catch{}}
      this.send(server,{v:15,from:'server',type:'ready',role:s.role});
      if(s.role==='viewer'){
        this.forward({v:15,type:'hello',from:s.id,to:'producer'},'publisher');
        const host=this.sockets().find(ws=>this.info(ws)?.role==='publisher');const status=host&&this.info(host)?.status;
        if(status)this.send(server,{...status,to:s.id});
      }else for(const ws of this.sockets())if(this.info(ws)?.role==='viewer')this.send(server,{v:15,from:this.info(ws).id,to:'producer',type:'hello'});
      return new Response(null,{status:101,webSocket:client});
    });
  }
  async webSocketMessage(ws,raw) {
    const s=this.info(ws);if(!s)return;
    if(!this.meta||this.meta.closed||Date.now()>=this.meta.expiresAt){ws.close(4000,'room-ended');return;}
    if(typeof raw!=='string'||raw.length>110000){ws.close(1009,'message-too-large');return;}
    const now=Date.now();s.bucket=Math.min(100,(s.bucket||0)+(now-s.last)*.03);s.last=now;
    if(--s.bucket<0){ws.close(1008,'rate-limit');return;}ws.serializeAttachment(s);
    let m;try{m=JSON.parse(raw);}catch{return;}
    if(!m||m.v!==15||typeof m.type!=='string')return;
    if(m.type==='ping'){this.send(ws,{v:15,from:'server',type:'pong'});return;}
    const pub=s.role==='publisher',from=pub?'producer':s.id,to=pub?(ID.test(m.to||'')?m.to:null):'producer';
    const packet={v:15,type:m.type,from,to};
    if(m.type==='status'&&pub){
      if(!['idle','preview','live'].includes(m.phase))return;
      Object.assign(packet,{phase:m.phase,muted:!!m.muted,videoPaused:!!m.videoPaused,audioAvailable:!!m.audioAvailable,startedAt:Number(m.startedAt)||0});
      s.status=packet;ws.serializeAttachment(s);this.forward(packet,'viewer',to);return;
    }
    if(m.type==='stop'&&pub){packet.reason='stopped';this.forward(packet,'viewer',to);return;}
    if(m.type==='hello'&&!pub){this.forward(packet,'publisher');return;}
    if(m.type==='bye'&&!pub){this.forward(packet,'publisher');ws.close(1000,'bye');return;}
    if(m.type==='retry'){this.forward(packet,pub?'viewer':'publisher',pub?to:null);return;}
    if(!ID.test(m.pid||''))return;packet.pid=m.pid;
    if((m.type==='offer'&&pub)||(m.type==='answer'&&!pub)){
      if(m.description?.type!==m.type||typeof m.description.sdp!=='string'||m.description.sdp.length>100000)return;
      packet.description={type:m.description.type,sdp:m.description.sdp};
    }else if(m.type==='ice'){
      const c=m.candidate;if(!c||typeof c.candidate!=='string'||c.candidate.length>3000)return;
      packet.candidate={candidate:c.candidate,sdpMid:typeof c.sdpMid==='string'?c.sdpMid.slice(0,64):null,sdpMLineIndex:Number.isInteger(c.sdpMLineIndex)?c.sdpMLineIndex:null,usernameFragment:typeof c.usernameFragment==='string'?c.usernameFragment.slice(0,256):undefined};
    }else return;
    if(pub&&!to)return;this.forward(packet,pub?'viewer':'publisher',pub?to:null);
  }
  webSocketClose(ws) {
    const s=this.info(ws);if(!s)return;
    // A close callback from a replaced socket cannot disconnect its replacement.
    if(this.sockets().some(other=>other!==ws&&this.info(other)?.id===s.id))return;
    if(s.role==='publisher')this.forward({v:15,from:'producer',type:'stop',reason:'sourceGone'},'viewer');
    else this.forward({v:15,from:s.id,to:'producer',type:'bye'},'publisher');
  }
  webSocketError(ws){this.webSocketClose(ws);try{ws.close(1011,'connection-error');}catch{}}
  async finish() {
    this.meta={...this.meta,closed:true};await this.ctx.storage.put('meta',this.meta);
    for(const ws of this.sockets()){this.send(ws,{v:15,from:'producer',type:'stop',reason:'stopped'});try{ws.close(4000,'room-ended');}catch{}}
  }
  async alarm(){await this.finish();await this.ctx.storage.deleteAll();this.meta=null;}
}
