(() => {
  'use strict';
  const art=document.querySelector('.hero-sequence');
  const portrait=art?.querySelector('.hero-portrait');
  const image=portrait?.querySelector('.hero-portrait-main');
  if(!image)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mouse=matchMedia('(hover: hover) and (pointer: fine)');
  let visible=true,suspended=false,ready=false,loading=false,lost=false;
  let canvas,gl,program,uniform,bounds,raf,previous=0;
  let pointer,target={x:0,y:0},look={x:0,y:0};
  const eligible=()=>mouse.matches&&!reduced.matches&&visible&&!suspended&&!document.hidden&&art.dataset.motionState==='complete';
  const vertex=`attribute vec2 position;varying vec2 uv;
    void main(){uv=vec2((position.x+1.0)*0.5,(1.0-position.y)*0.5);gl_Position=vec4(position,0.0,1.0);}`;
  const fragment=`precision highp float;varying vec2 uv;uniform sampler2D photo;uniform vec2 gaze;
    void main(){
      // The canvas includes a small transparent margin for the moving silhouette.
      vec2 original=uv*1.06-0.03;
      float head=(1.0-smoothstep(0.52,0.68,original.y))*smoothstep(0.22,0.34,original.x)*(1.0-smoothstep(0.75,0.85,original.x));
      vec2 pivot=vec2(0.53,0.61),local=original-pivot;
      float angle=-gaze.x*0.045,c=cos(angle),s=sin(angle);
      vec2 turned=vec2(c*local.x-s*local.y,s*local.x+c*local.y)+pivot;
      turned.x-=gaze.x*(0.01+max(0.0,0.58-original.y)*0.012);
      turned.y-=gaze.y*0.012;
      turned.y=pivot.y+(turned.y-pivot.y)*(1.0+gaze.y*0.015);
      vec2 sampleAt=mix(original,turned,head);
      // Move only the iris-sized region, leaving the glasses and eyelids intact.
      float leftEye=1.0-smoothstep(0.15,1.0,length((sampleAt-vec2(0.5048,0.2755))/vec2(0.026,0.014)));
      float rightEye=1.0-smoothstep(0.15,1.0,length((sampleAt-vec2(0.6435,0.2929))/vec2(0.026,0.014)));
      sampleAt-=gaze*vec2(0.0035,0.002)*(leftEye+rightEye);
      if(sampleAt.x<0.0||sampleAt.x>1.0||sampleAt.y<0.0||sampleAt.y>1.0){gl_FragColor=vec4(0.0);return;}
      vec4 color=texture2D(photo,sampleAt);
      // Match the existing portrait's bottom fade; the torso stays undeformed.
      float fade=sampleAt.y<0.74?1.0:sampleAt.y<0.86?mix(1.0,0.733333,(sampleAt.y-0.74)/0.12):mix(0.733333,0.0,(sampleAt.y-0.86)/0.14);
      color.a*=clamp(fade,0.0,1.0);gl_FragColor=color;
    }`;
  function shader(type,source){
    const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw Error('Portrait shader unavailable');
    return result;
  }
  function measure(){
    bounds=image.getBoundingClientRect();
    if(!ready)return;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.round(bounds.width*1.06*dpr)),height=Math.max(1,Math.round(bounds.height*1.06*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
  }
  function aim(){
    if(!pointer||!bounds){target={x:0,y:0};return;}
    const clamp=value=>Math.max(-1,Math.min(1,value));
    target={x:clamp((pointer.x-bounds.left-bounds.width*.575)/(bounds.width*.9)),y:clamp((pointer.y-bounds.top-bounds.height*.285)/(bounds.height*.8))};
  }
  function draw(){gl.uniform2f(uniform,look.x,look.y);gl.drawArrays(gl.TRIANGLES,0,6);}
  function stop(){
    if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;previous=0;
    look={x:0,y:0};target={x:0,y:0};delete portrait.dataset.gaze;
  }
  function step(now){
    raf=undefined;
    if(!eligible()||lost){stop();return;}
    const dt=previous?Math.min((now-previous)/1000,.05):1/60;previous=now;
    const smoothing=1-Math.exp(-dt*9);
    look.x+=(target.x-look.x)*smoothing;look.y+=(target.y-look.y)*smoothing;
    const moving=Math.abs(target.x-look.x)+Math.abs(target.y-look.y)>.001;
    if(!moving){look.x=target.x;look.y=target.y;}
    draw();portrait.dataset.gaze='active';
    if(moving)raf=requestAnimationFrame(step);else previous=0;
  }
  function schedule(){if(ready&&eligible()&&!lost&&raf===undefined)raf=requestAnimationFrame(step);}
  async function prepare(){
    if(ready||loading||lost||!eligible())return;
    loading=true;
    try{
      await image.decode();if(!eligible()){loading=false;return;}
      canvas=document.createElement('canvas');canvas.className='hero-gaze';canvas.setAttribute('aria-hidden','true');
      gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
      if(!gl)throw Error('WebGL unavailable');
      program=gl.createProgram();const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Portrait program unavailable');
      gl.deleteShader(v);gl.deleteShader(f);gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.uniform1i(gl.getUniformLocation(program,'photo'),0);uniform=gl.getUniformLocation(program,'gaze');
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;stop();canvas.remove();});
      portrait.append(canvas);ready=true;measure();draw();aim();schedule();
    }catch{lost=true;canvas?.remove();stop();}
    loading=false;
  }
  function reconcile(){
    if(!eligible()){stop();return;}
    measure();aim();if(ready)schedule();else prepare();
  }
  window.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    pointer={x:event.clientX,y:event.clientY};
    if(!eligible()||document.body.inert)return;
    aim();if(ready)schedule();else prepare();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer=undefined;aim();schedule();});
  window.addEventListener('blur',()=>{pointer=undefined;aim();schedule();});
  const motion=new MutationObserver(reconcile);motion.observe(art,{attributes:true,attributeFilter:['data-motion-state']});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();},{threshold:.1}).observe(portrait);
  if('ResizeObserver' in window)new ResizeObserver(reconcile).observe(portrait);
  window.addEventListener('scroll',()=>{if(eligible()){measure();aim();schedule();}},{passive:true});
  window.addEventListener('resize',reconcile);
  window.addEventListener('pagehide',()=>{suspended=true;stop();});
  window.addEventListener('pageshow',()=>{suspended=false;reconcile();});
  document.addEventListener('visibilitychange',reconcile);reduced.addEventListener('change',reconcile);mouse.addEventListener('change',reconcile);
  reconcile();
})();
