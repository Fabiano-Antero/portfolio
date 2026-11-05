// Unit tests of the browser signaling client. Network and timers are mocked.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const text=fs.readFileSync(path.join(__dirname,'../online.js'),'utf8');
const results=[];const check=(name,fn)=>{fn();results.push({name,passed:true});};
function make(){
 let calls=[],sockets=[],timers=new Map(),i=0;
 class WS{static OPEN=1;constructor(url){this.url=url;this.readyState=1;this.sent=[];sockets.push(this);queueMicrotask(()=>this.onmessage?.({data:JSON.stringify({v:15,from:'server',type:'ready'})}));}send(data){this.sent.push(JSON.parse(data));}close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000}));}}
 const box={window:{VozOnlineConfig:{apiBase:'https://api.example'}},WebSocket:WS,URL,URLSearchParams,AbortSignal,Response,Error,Math,JSON,Promise,location:{hash:'#room='+ 'a'.repeat(32)+'&key='+'b'.repeat(64)},setTimeout:fn=>{timers.set(++i,fn);return i},clearTimeout:id=>timers.delete(id),setInterval:()=>++i,clearInterval:()=>{},fetch:async(url,opt)=>{calls.push({url,opt});return Response.json(url.endsWith('/join')?{ticket:'c'.repeat(64),iceServers:[{urls:'stun:example'}],relayAvailable:true}: {room:'a'.repeat(32),publisherToken:'d'.repeat(64),viewerToken:'b'.repeat(64)});}};
 vm.createContext(box);vm.runInContext(text,box);return {box,N:box.window.VozOnline,calls,sockets};
}
(async()=>{
 const {N,box,calls,sockets}=make();check('Valid HTTPS API accepted',()=>assert.equal(N.configured(),true));
 box.window.VozOnlineConfig.apiBase='http://remote.example';check('Insecure remote API rejected',()=>assert.equal(N.configured(),false));box.window.VozOnlineConfig.apiBase='https://api.example';
 check('Invitation parsed from fragment',()=>{assert.equal(N.parseLink().room,'a'.repeat(32));assert.equal(N.parseLink().token,'b'.repeat(64));});
 box.location.hash='#room=bad';check('Malformed invitation rejected',()=>assert.equal(N.parseLink(),null));
 await N.create('test-password');check('Publisher password only in Authorization header',()=>{assert.equal(calls[0].opt.headers.Authorization,'Bearer test-password');assert.equal(calls[0].opt.credentials,'omit');assert.ok(!calls[0].url.includes('test-password'));});
 let statuses=[],messages=[];const c=new N.Signal({room:'a'.repeat(32),token:'b'.repeat(64),role:'viewer',clientId:'e'.repeat(32),onState:s=>statuses.push(s)});c.onmessage=e=>messages.push(e.data);
 c.postMessage({type:'offer'});await c.open();
 check('Join carries role token in POST body',()=>{const body=JSON.parse(calls[1].opt.body);assert.equal(body.role,'viewer');assert.equal(body.token,'b'.repeat(64));});
 check('WebSocket carries only single-use ticket',()=>{assert.ok(sockets[0].url.includes('ticket='+'c'.repeat(64)));assert.ok(!sockets[0].url.includes('b'.repeat(64)));});
 check('Ready state configures ICE before negotiation',()=>{assert.equal(c.ready,true);assert.equal(c.rtcConfig.iceServers.length,1);assert.equal(statuses.at(-1),'connected');});
 check('No stale offer queued while offline',()=>assert.equal(sockets[0].sent.length,0));
 c.postMessage({v:15,type:'hello'});check('Ready client sends signal',()=>assert.equal(sockets[0].sent[0].type,'hello'));
 sockets[0].onmessage({data:JSON.stringify({v:15,type:'offer',from:'producer'})});check('Peer signal delivered',()=>assert.equal(messages[0].type,'offer'));
 sockets[0].onmessage({data:JSON.stringify({v:15,type:'pong',from:'server'})});check('Server heartbeat not sent to negotiation handler',()=>assert.equal(messages.length,1));
 c.close();check('Closing clears readiness and disallows further messages',()=>{assert.equal(c.ready,false);assert.equal(c.closed,true);c.postMessage({type:'hello'});assert.equal(sockets[0].sent.length,1);});
 const report={environment:'Node VM; mocked WebSockets, fetch and timers; no media transport',tests:results};fs.writeFileSync(path.join(__dirname,'online-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
