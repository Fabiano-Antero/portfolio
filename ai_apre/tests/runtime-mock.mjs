/** TEST ONLY: in-memory Durable Objects/WebSocket mocks, not a workerd emulator. */
import {readFile} from 'node:fs/promises';
export const NativeResponse=globalThis.Response;
globalThis.Response=class extends NativeResponse {
  constructor(data,options={}){if(options.status===101){super(null,{status:200});Object.defineProperty(this,'status',{value:101});this.webSocket=options.webSocket;}else super(data,options);}
};
class Socket {
  constructor(){this.readyState=1;this.messages=[];this.owner=null;}
  serializeAttachment(value){this.attachment=structuredClone(value);}
  deserializeAttachment(){return structuredClone(this.attachment);}
  send(data){this.peer.messages.push(JSON.parse(data));this.peer.onmessage?.(data);}
  close(code=1000,reason=''){if(this.readyState!==1)return;this.readyState=3;this.peer.readyState=3;queueMicrotask(()=>{this.owner?.webSocketClose(this,code,reason,true);this.peer.owner?.webSocketClose(this.peer,code,reason,true);this.peer.onclose?.(code,reason);});}
  async fromClient(data){await this.owner.webSocketMessage(this,JSON.stringify(data));}
}
globalThis.WebSocketPair=class {constructor(){this[0]=new Socket;this[1]=new Socket;this[0].peer=this[1];this[1].peer=this[0];}};
globalThis.__DO=class{constructor(ctx,env){this.ctx=ctx;this.env=env;}};
const text=(await readFile(new URL('../backend/worker.js',import.meta.url),'utf8')).replace("import { DurableObject } from 'cloudflare:workers';","const DurableObject=globalThis.__DO;");
export const mod=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
class Context {
  constructor(){this.data=new Map;this.websockets=[];this.queue=Promise.resolve();this.storage={
    get:async key=>structuredClone(this.data.get(key)),
    put:async (key,value)=>{if(typeof key==='string')this.data.set(key,structuredClone(value));else for(const [k,v] of Object.entries(key))this.data.set(k,structuredClone(v));},
    delete:async key=>this.data.delete(key),deleteAll:async()=>this.data.clear(),getAlarm:async()=>this.alarm||null,setAlarm:async time=>{this.alarm=time;}
  };}
  blockConcurrencyWhile(fn){const p=this.queue.then(fn);this.queue=p.catch(()=>{});return p;}
  getWebSockets(){return this.websockets.filter(x=>x.readyState===1);}
  acceptWebSocket(ws){ws.owner=this.instance;this.websockets.push(ws);}
}
export function makeEnv(overrides={}) {
  const env={ALLOWED_ORIGINS:'http://localhost:8788,https://fabianoantero.site',PUBLISH_PASSWORD:'test-only-broadcast-password',REQUIRE_TURN:'false',...overrides};
  function ns(K){const all=new Map;return {all,getByName(name){if(!all.has(name)){const ctx=new Context;ctx.instance=new K(ctx,env);all.set(name,ctx);}const ctx=all.get(name);return {fetch:async req=>{await ctx.queue;return ctx.instance.fetch(req);}};}};}
  env.ROOMS=ns(mod.Room);env.AUTH_GUARD=ns(mod.AuthGuard);return env;
}
export const origin='https://fabianoantero.site';
export function request(env,path,{method='POST',data={},password,origin:orig=origin,headers={}}={}) {
  const req=new Request('https://api.example'+path,{method,headers:{Origin:orig,'Content-Type':'application/json',...(password?{Authorization:'Bearer '+password}:{}),...headers},...(method!=='GET'?{body:JSON.stringify(data)}:{})});
  return mod.default.fetch(req,env);
}
