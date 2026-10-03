import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/loaders/GLTFLoader.js';
import { createCharacterChat } from './chibi-chat.js';

const mouse = matchMedia('(any-hover: hover) and (any-pointer: fine)');
const clamp = THREE.MathUtils.clamp;
const smooth = value => { const t=clamp(value,0,1); return t*t*(3-2*t); };
let dismissed = false;
try { dismissed = sessionStorage.getItem('portfolio-chibi-hidden') === 'true'; } catch {}

async function createPet() {
  if (dismissed) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer, chat;
  try {
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,stencil:false,powerPreference:'low-power'});
    renderer.setSize(240,260);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor(0,0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const [asset,{default:hangingData},{default:fallingData},{default:walkingData},{default:standingData},{default:idleData},{default:talkingData}] = await Promise.all([
      new GLTFLoader().loadAsync(new URL('../models/fabiano-chibi.glb',import.meta.url).href),
      import('../models/hanging-idle.js'),
      import('../models/falling.js'),
      import('../models/sad-walk.js'),
      import('../models/stand-up.js'),
      import('../models/idle.js'),
      import('../models/talking.js')
    ]);
    const model = asset.scene;
    const fallClip = THREE.AnimationClip.parse(fallingData);
    const walkClip = THREE.AnimationClip.parse(walkingData);
    const standClip = THREE.AnimationClip.parse(standingData);
    const idleClip = THREE.AnimationClip.parse(idleData);
    const talkClip = THREE.AnimationClip.parse(talkingData);
    if(!fallClip || !walkClip)throw new Error('Missing character animation clips');
    // The supplied walk advances its root. Let the viewport controller carry
    // that travel, retaining the authored hip sway and vertical movement while
    // removing the accumulated horizontal displacement at each loop seam.
    const walkRoot=walkClip.tracks.find(track=>track.name==='mixamorigHips.position');
    let walkStride=.3;
    if(walkRoot) {
      const rest=model.getObjectByName('mixamorigHips').position;
      const start=Array.from(walkRoot.values.slice(0,3));
      const end=Array.from(walkRoot.values.slice(-3));
      walkStride=Math.hypot(end[0]-start[0],end[2]-start[2])||walkStride;
      for(let i=0;i<walkRoot.times.length;i++) {
        const progress=walkRoot.times[i]/walkClip.duration;
        for(const axis of [0,2])walkRoot.values[i*3+axis]-=start[axis]-rest.getComponent(axis)+(end[axis]-start[axis])*progress;
      }
    }
    const mixer = new THREE.AnimationMixer(model);
    const fallAction = mixer.clipAction(fallClip);
    fallAction.setLoop(THREE.LoopOnce,1);
    fallAction.clampWhenFinished = true;
    const walkAction = mixer.clipAction(walkClip).setLoop(THREE.LoopRepeat,Infinity);
    const hangingClip = THREE.AnimationClip.parse(hangingData);
    const hangingAction = mixer.clipAction(hangingClip).setLoop(THREE.LoopRepeat,Infinity);
    const standAction = mixer.clipAction(standClip).setLoop(THREE.LoopOnce,1);
    standAction.clampWhenFinished = true;
    const idleAction = mixer.clipAction(idleClip).setLoop(THREE.LoopRepeat,Infinity);
    const talkAction = mixer.clipAction(talkClip).setLoop(THREE.LoopRepeat,Infinity);
    const layer = document.createElement('div');
    layer.className = 'chibi-layer';
    const pet = document.createElement('div');
    pet.className = 'chibi-pet';
    pet.dataset.state = 'idle';
    const trigger = document.createElement('button');
    trigger.className = 'chibi-trigger';
    trigger.type = 'button';
    const close = document.createElement('button');
    close.className = 'chibi-close';
    close.type = 'button';
    close.textContent = '×';
    renderer.domElement.setAttribute('aria-hidden','true');
    pet.append(renderer.domElement,trigger,close);
    const pointer = document.createElement('div');
    pointer.className = 'chibi-pointer';
    pointer.hidden = true;
    pointer.setAttribute('aria-hidden','true');
    pointer.innerHTML = '<svg viewBox="0 0 28 40" width="28" height="40"><path d="M2 2 2 30 9 24 15 37 21 34 15 22 25 22Z" fill="#101114" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>';
    layer.append(pet,pointer);
    document.body.append(layer);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-.73,.73,.79,-.79,.1,20);
    camera.position.set(0,.52,5);
    camera.lookAt(0,.52,0);
    camera.updateMatrixWorld(true);
    const sizeCamera=()=>{
      camera.zoom=Math.max(.05,Math.min(1,(innerWidth-24)/155,(innerHeight-24)/210));
      camera.updateProjectionMatrix();
    };
    sizeCamera();
    scene.add(new THREE.HemisphereLight(0xffffff,0x82756a,1.6));
    const key = new THREE.DirectionalLight(0xffffff,2);
    key.position.set(-2,3,4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff6b3d,2);
    rim.position.set(2,1,-2);
    scene.add(rim);
    const pivot = new THREE.Group();
    pivot.position.y = .52;
    model.position.y = -.52;
    pivot.add(model);
    scene.add(pivot);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.frustumCulled = false;
    });
    const bones = new Map();
    model.traverse(node => {
      if(node.isBone)bones.set(node.name.replace(/^mixamorig:?/,''),{node,quaternion:node.quaternion.clone(),position:node.position.clone(),scale:node.scale.clone()});
    });
    const world = new THREE.Vector3(), localRotation = new THREE.Quaternion();
    const bounds = new THREE.Box3();
    const handLeft = new THREE.Vector3(), handRight = new THREE.Vector3();
    const turn = new THREE.Euler();
    const bone = name => bones.get(name)?.node;
    let state = 'idle', stateSince = performance.now(), lastFrame = stateSince;
    let timer, preferenceCheck, frame, alive = true, lastRender = 0, rearmAt = 0;
    let x = innerWidth-184, y = innerHeight-234, vx = 0, vy = 0;
    let shake = 0, cursorScale = 1;
    let pointerX = 92, pointerY = innerHeight-110, pointerSeen = false, pointerType = 'mouse';
    let lastMove = 0, speedX = 0, speedY = 0, previousDirectionX = 0, previousDirectionY = 0;
    let fallAngle = 0, fallPitch=0,fallYaw=0;
    let returnStartX = 0, returnDuration = 2;
    const impactRotation=new THREE.Euler();
    const walkSpeed=()=>walkStride*240/(camera.right-camera.left)*camera.zoom/walkClip.duration;
    let lookYaw=0,lookPitch=0,lastReduced=reduced.matches;
    let clipStarted=0, transitionPose=new Map();
    const transitionRotation=new THREE.Quaternion();
    const home = () => ({x:innerWidth-184,y:innerHeight-234});
    const language = () => {
      const english = document.documentElement.lang === 'en';
      trigger.setAttribute('aria-label',english?'Play with the 3D character. Carry him for 10 seconds. Escape releases him.':'Brincar com o personagem 3D. Carregue por 10 segundos. Escape faz ele soltar.');
      close.setAttribute('aria-label',english?'Hide character':'Ocultar personagem');
      trigger.title = english?'Move the pointer over me':'Passe o cursor sobre mim';
    };
    const cursorVisible = visible => {
      const active = visible && mouse.matches && pointerType==='mouse';
      pointer.hidden = !active;
      document.documentElement.classList.toggle('chibi-cursor',active);
    };
    const setState = next => {
      if(next==='idle'&&chat?.isOpen)next='talking';
      // Keep the actual departing pose so authored clips and the cursor grip
      // meet smoothly, including the final falling pose before standing up.
      transitionPose=new Map([...bones].map(([name,entry])=>[name,{quaternion:entry.node.quaternion.clone(),position:entry.node.position.clone(),scale:entry.node.scale.clone()}]));
      transitionRotation.copy(pivot.quaternion);
      if(next==='landed')impactRotation.copy(pivot.rotation);
      mixer.stopAllAction();
      state = next;
      stateSince = performance.now();
      if(next==='idle' || next==='talking' || next==='attached' || next==='falling' || next==='standing' || next==='returning') {
        clipStarted=stateSince;
        (next==='talking'?talkAction:next==='idle'?idleAction:next==='attached'?hangingAction:next==='standing'?standAction:next==='falling'?fallAction:walkAction).reset().play();
      }
      pet.dataset.state = next;
      chat?.setCharacterState(next);
      pet.dataset.animation = next==='talking'?talkClip.name:next==='idle'?idleClip.name:next==='attached'?'Hanging Idle':next==='falling'?fallClip.name:next==='landed'?'Impact':next==='standing'?standClip.name:next==='returning'?walkClip.name:'procedural';
      trigger.disabled = next!=='idle' || reduced.matches;
      close.tabIndex = next==='idle'?0:-1;
    };
    const pose = (now,dt) => {
      const elapsed = (now-stateSince)/1000;
      bones.forEach(entry => {entry.node.quaternion.copy(entry.quaternion);entry.node.position.copy(entry.position);entry.node.scale.copy(entry.scale);});
      pivot.rotation.set(0,0,0);
      pivot.position.y = .52;
      if(state==='landed') {
        // Hold the exact collision pose. Airborne limb motion stops on impact.
        bones.forEach((entry,name)=>{
          const snapshot=transitionPose.get(name);
          if(snapshot){entry.node.quaternion.copy(snapshot.quaternion);entry.node.position.copy(snapshot.position);entry.node.scale.copy(snapshot.scale);}
        });
        pivot.rotation.copy(impactRotation);
        model.updateWorldMatrix(true,true);
        return;
      }
      const authored=state==='idle' || state==='talking' || state==='attached' || state==='falling' || state==='standing' || state==='returning';
      if(state==='falling') {
        const settle=1-smooth((now-clipStarted)/450);
        pivot.rotation.set(fallPitch*settle,fallYaw*settle,fallAngle*settle);
      } else if(state==='returning') {
        pivot.rotation.y = Math.sign(home().x-returnStartX)*Math.PI/2;
      }
      if(authored) {
        // Preserve all of the supplied bone tracks. The DOM container carries
        // the character across the viewport; the clips provide its movement.
        const clipTime=Math.max(0,(now-clipStarted)/1000);
        const action=state==='talking'?talkAction:state==='idle'?idleAction:state==='attached'?hangingAction:state==='returning'?walkAction:state==='standing'?standAction:fallAction;
        // Evaluate an absolute clip time without rewinding a clamped, paused
        // fall action back to frame zero on subsequent landed frames.
        action.paused=false;
        const duration=action.getClip().duration;
        action.time=reduced.matches?0:state==='idle'||state==='talking'||state==='attached'||state==='returning'?clipTime%duration:Math.min(clipTime,duration);
        mixer.update(0);
        pet.dataset.animationTime=action.time.toFixed(3);
      }
      if(state==='idle') {
        // Evaluate Idle first, then add the cursor look to its animated head.
        // The supplied body, arms and subtle head motion remain intact.
        model.updateWorldMatrix(true,true);
        if(reduced.matches){lookYaw=0;lookPitch=0;}
        else if(pointerSeen){
          bone('Head').getWorldPosition(world).project(camera);
          const targetYaw=clamp((pointerX-(x+(world.x+1)*120))/350,-.5,.5);
          const targetPitch=clamp((pointerY-(y+(1-world.y)*130))/400,-.3,.25);
          const ease=1-Math.exp(-dt*5);
          lookYaw+=(targetYaw-lookYaw)*ease;lookPitch+=(targetPitch-lookPitch)*ease;
        }
        localRotation.setFromEuler(turn.set(lookPitch,lookYaw,0));
        bone('Head').quaternion.multiply(localRotation);
        pet.dataset.lookYaw=lookYaw.toFixed(3);pet.dataset.lookPitch=lookPitch.toFixed(3);
      }
      const blendDuration=state==='standing'?.35:state==='idle'?.25:authored?.28:0;
      if(blendDuration && elapsed<blendDuration && !reduced.matches) {
        const blend=smooth(elapsed/blendDuration);
        pivot.quaternion.slerpQuaternions(transitionRotation,pivot.quaternion.clone(),blend);
        bones.forEach((entry,name)=>{
          const previous=transitionPose.get(name);
          if(!previous)return;
          entry.node.quaternion.slerpQuaternions(previous.quaternion,entry.node.quaternion.clone(),blend);
          entry.node.position.lerpVectors(previous.position,entry.node.position.clone(),blend);
          entry.node.scale.lerpVectors(previous.scale,entry.node.scale.clone(),blend);
        });
      }
      model.updateWorldMatrix(true,true);
    };
    const grip = () => {
      // The supplied clip uses both hands. Anchor their midpoint to the cursor
      // without changing their original separation or rotating the authored pose.
      bone('RightHandIndex1').getWorldPosition(handRight);
      bone('LeftHandIndex1').getWorldPosition(handLeft);
      handRight.add(handLeft).multiplyScalar(.5).project(camera);
      return {x:(handRight.x+1)*120,y:(1-handRight.y)*130};
    };
    const bodyBounds = () => {
      model.updateWorldMatrix(true,true);
      model.traverse(node=>{if(node.isSkinnedMesh)node.computeBoundingBox();});
      bounds.setFromObject(model);
      handLeft.copy(bounds.min).project(camera);handRight.copy(bounds.max).project(camera);
      return {left:(handLeft.x+1)*120,right:(handRight.x+1)*120,top:(1-handRight.y)*130,bottom:(1-handLeft.y)*130};
    };
    const beginFall = () => {
      if(state!=='attached')return;
      clearTimeout(timer);
      fallAngle=pivot.rotation.z;fallPitch=pivot.rotation.x;fallYaw=pivot.rotation.y;
      vx=clamp(speedX*160,-280,280);vy=20;
      cursorVisible(false);
      shake=0;
      setState('falling');
    };
    const attach = event => {
      if(state!=='idle' || reduced.matches || chat?.isOpen || performance.now()<rearmAt)return;
      if(event?.clientX!=null){pointerX=event.clientX;pointerY=event.clientY;pointerType=event.pointerType||'mouse';}
      else if(!pointerSeen){pointerX=Math.min(innerWidth-80,200);pointerY=Math.max(80,innerHeight-280);}
      speedX=0;speedY=0;shake=0;cursorScale=1;
      previousDirectionX=0;previousDirectionY=0;
      setState('attached');
      cursorVisible(true);
      timer=setTimeout(beginFall,10_000);
      schedule();
    };
    const trackPointer = event => {
      if(event.pointerType==='touch' && state!=='attached')return;
      const now=performance.now(), delta=Math.max(8,now-lastMove);
      const nextSpeedX=clamp((event.clientX-pointerX)/delta,-6,6);
      const nextSpeedY=clamp((event.clientY-pointerY)/delta,-6,6);
      if(state==='attached' && pointerSeen && delta<180) {
        const speed=Math.hypot(nextSpeedX,nextSpeedY);
        if(speed>.25) {
          const nextX=nextSpeedX/speed,nextY=nextSpeedY/speed;
          if(speed>.45 && nextX*previousDirectionX+nextY*previousDirectionY<-.2)shake=Math.min(1.3,shake+.42);
          previousDirectionX=nextX;previousDirectionY=nextY;
        }
      }
      speedX=nextSpeedX;speedY=nextSpeedY;
      pointerX=event.clientX;pointerY=event.clientY;pointerType=event.pointerType||'mouse';
      pointerSeen=true;lastMove=now;
      if(state==='attached')cursorVisible(true);
    };
    const renderFrame = now => {
      frame=undefined;
      if(!alive || document.hidden)return;
      if(state==='idle' && !reduced.matches && now-lastRender<50){schedule();return;}
      const dt=Math.min((now-lastFrame)/1000,.035);
      lastFrame=now;
      // Some browsers defer MediaQueryList change events. Keep state and native
      // cursor cleanup aligned with the actual preference before rendering.
      if(reduced.matches!==lastReduced)motion();
      if(reduced.matches){const target=home();x=target.x;y=target.y;pose(now,0);}
      else {
        const elapsed=(now-stateSince)/1000;
        shake=Math.max(0,shake-dt*.8);
        cursorScale+=(1+Math.min(shake,1)*2.2-cursorScale)*(1-Math.exp(-dt*16));
        if(now-lastMove>90){speedX*=Math.exp(-dt*8);speedY*=Math.exp(-dt*8);}
        pose(now,dt);
        if(state==='attached') {
          const hands=grip();
          x=pointerX+12*cursorScale-hands.x;
          y=pointerY+25*cursorScale-hands.y;
          pointer.style.transform=`translate3d(${pointerX-2}px,${pointerY-2}px,0) scale(${cursorScale})`;
          pet.dataset.cursorScale=cursorScale.toFixed(2);
        } else if(state==='falling') {
          vy+=1400*dt;x+=vx*dt;y+=vy*dt;
          // Detect contact with the deformed mesh, before viewport clamping
          // can hide penetration and leave the falling clip playing in place.
          const fallingBox=bodyBounds();
          if(y+fallingBox.bottom>=innerHeight-16) {
            vx=0;vy=0;
            setState('landed');pose(now,0);y=innerHeight-16-bodyBounds().bottom;
          }
        } else if(state==='landed') {
          y=innerHeight-16-bodyBounds().bottom;
          if(elapsed>=.18)setState('standing');
        } else if(state==='standing') {
          y=innerHeight-16-bodyBounds().bottom;
          if(elapsed>=standClip.duration){
            returnStartX=x;returnDuration=Math.max(.25,Math.abs(x-home().x)/walkSpeed());
            pet.dataset.returnDuration=returnDuration.toFixed(3);
            pet.dataset.walkSpeed=walkSpeed().toFixed(3);
            setState('returning');
          }
        } else if(state==='returning') {
          // A cycle advances by the original FBX stride at its authored tempo.
          // Constant travel avoids accelerating past the feet in mid-return.
          x=THREE.MathUtils.lerp(returnStartX,home().x,clamp(elapsed/returnDuration,0,1));
          y=innerHeight-16-bodyBounds().bottom;
          if(elapsed>=returnDuration){x=home().x;y=home().y;rearmAt=now+1200;setState('idle');}
        } else if(state==='idle'||state==='talking') {x=home().x;y=home().y;}
      }
      const box=bodyBounds();
      if(state==='falling' && (x<8-box.left || x>innerWidth-8-box.right))vx=0;
      x=clamp(x,8-box.left,innerWidth-8-box.right);
      y=clamp(y,8-box.top,innerHeight-8-box.bottom);
      pet.dataset.bounds=JSON.stringify({left:x+box.left,right:x+box.right,top:y+box.top,bottom:y+box.bottom});
      pet.style.transform=`translate3d(${x}px,${y}px,0)`;
      pet.dataset.x=x.toFixed(1);pet.dataset.y=y.toFixed(1);
      if(state!=='idle' || now-lastRender>50 || reduced.matches) {
        renderer.render(scene,camera);lastRender=now;
      }
      if(!reduced.matches)schedule();
    };
    const schedule = () => {if(alive && !document.hidden && frame===undefined)frame=requestAnimationFrame(renderFrame);};
    const reset = () => {
      clearTimeout(timer);cursorVisible(false);shake=0;
      setState('idle');schedule();
    };
    const escape = event => {if(event.key==='Escape')beginFall();};
    const visibility = () => {if(document.hidden){cursorVisible(false);cancelAnimationFrame(frame);frame=undefined;}else{lastFrame=performance.now();schedule();}};
    const leave = () => {cursorVisible(false);beginFall();speedX=0;speedY=0;};
    const resize = () => {sizeCamera();if(state==='idle'||state==='talking'){x=home().x;y=home().y;}schedule();};
    const motion = () => {
      lastReduced=reduced.matches;
      if(reduced.matches)reset();else schedule();
      trigger.hidden=reduced.matches;
      trigger.disabled=state!=='idle' || reduced.matches;
    };
    const onMotionChange = () => motion();
    const destroy = () => {
      alive=false;clearTimeout(timer);clearInterval(preferenceCheck);cancelAnimationFrame(frame);cursorVisible(false);
      document.removeEventListener('pointermove',trackPointer);
      document.removeEventListener('keydown',escape);
      document.removeEventListener('portfolio:language',language);
      document.removeEventListener('visibilitychange',visibility);
      document.documentElement.removeEventListener('pointerleave',leave);
      window.removeEventListener('blur',leave);
      window.removeEventListener('resize',resize);
      reduced.removeEventListener('change',onMotionChange);
      mixer.stopAllAction();mixer.uncacheRoot(model);
      const textures=new Set();
      model.traverse(node=>{if(node.isMesh){node.geometry.dispose();for(const material of [node.material].flat()){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}}});
      textures.forEach(texture=>{texture.dispose();texture.source?.data?.close?.();});
      chat?.destroy();renderer.dispose();layer.remove();
    };
    trigger.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')attach(event);});
    trigger.addEventListener('pointerdown',event=>{if(event.button===0){attach(event);if(event.pointerType==='touch')trigger.setPointerCapture(event.pointerId);}});
    trigger.addEventListener('click',event=>{if(event.detail===0)attach();});
    trigger.addEventListener('pointerup',event=>{if(event.pointerType==='touch')beginFall();});
    close.addEventListener('click',()=>{try{sessionStorage.setItem('portfolio-chibi-hidden','true');}catch{}destroy();});
    document.addEventListener('pointermove',trackPointer,{passive:true});
    document.addEventListener('keydown',escape);
    document.addEventListener('portfolio:language',language);
    document.addEventListener('visibilitychange',visibility);
    document.documentElement.addEventListener('pointerleave',leave);
    window.addEventListener('blur',leave);
    window.addEventListener('resize',resize);
    reduced.addEventListener('change',onMotionChange);
    preferenceCheck=setInterval(()=>{if(reduced.matches!==lastReduced)motion();},500);
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();destroy();},{once:true});
    chat=createCharacterChat(layer,{onOpen:()=>{pet.dataset.chatOpen='true';if(state==='idle')setState('talking');else beginFall();schedule();},onClose:()=>{delete pet.dataset.chatOpen;if(state==='talking')setState('idle');schedule();}});
    setState('idle');language();motion();schedule();
  } catch(error) {
    renderer?.dispose();
    console.warn('Character unavailable:',error.message);
    if(!chat){const fallback=document.createElement('div');fallback.className='chibi-layer';document.body.append(fallback);chat=createCharacterChat(fallback);}
  }
}

if('requestIdleCallback' in window)requestIdleCallback(createPet,{timeout:1500});
else setTimeout(createPet,600);
