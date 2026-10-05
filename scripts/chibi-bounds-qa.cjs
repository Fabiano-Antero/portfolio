const assert=require('node:assert/strict'),fs=require('node:fs');const {chromium}=require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.route('https://www.clarity.ms/**',r=>r.abort());await p.addInitScript(()=>sessionStorage.setItem('portfolio-chibi-hidden','true'));await p.goto(process.env.PORTFOLIO_URL||'http://localhost:4173');
 const results=await p.evaluate(async()=>{
 const THREE=await import('/assets/vendor/three/three.module.js');const {GLTFLoader}=await import('/assets/vendor/three/loaders/GLTFLoader.js');const {createCharacterBounds}=await import('/assets/js/chibi-bounds.js');
 const model=(await new GLTFLoader().loadAsync('/assets/models/fabiano-chibi-web.glb')).scene;const root=new THREE.Group();root.add(model);root.updateMatrixWorld(true);
 const fast=createCharacterBounds(model),exact=new THREE.Box3(),mixer=new THREE.AnimationMixer(model);let poses=0,maxExpansion=0,failures=[];
 for(const file of ['idle','hanging-idle','falling','stand-up','sad-walk','talking']){
  const data=(await import('/assets/models/'+file+'.js')).default;const clip=THREE.AnimationClip.parse(data);mixer.stopAllAction();const action=mixer.clipAction(clip).play();
  for(let sample=0;sample<16;sample++){
   action.time=clip.duration*sample/16;mixer.update(0);root.rotation.set(sample*.01, sample*.04,sample*.025);root.updateMatrixWorld(true);
   const f=fast().clone();exact.setFromObject(model,true);
   const margin=f.clone().expandByScalar(.000001);if(!margin.containsBox(exact))failures.push({file,sample,fast:f,exact:exact.clone()});
   maxExpansion=Math.max(maxExpansion,f.getSize(new THREE.Vector3()).length()/exact.getSize(new THREE.Vector3()).length());poses++;
  }
 }
 let t=performance.now();for(let i=0;i<50;i++)fast();const fastMs=(performance.now()-t)/50;t=performance.now();for(let i=0;i<50;i++){model.traverse(n=>{if(n.isSkinnedMesh)n.computeBoundingBox()});exact.setFromObject(model,true)}const exactMs=(performance.now()-t)/50;
 return {poses,failures,maxExpansion,fastMs,exactMs,speedup:exactMs/fastMs};
 });assert.equal(results.failures.length,0);assert(results.speedup>4);fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/chibi-bounds-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
