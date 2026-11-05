'use strict';
/**
 * Whole-portrait return compositor. Source video remains untouched during speech.
 * Bidirectional correspondences, prepared from every original frame, align source
 * and neutral portraits before mixing. No cut-out mouth, face mask or generated pose.
 * A 2D full-frame dissolve is available if WebGL/flow textures cannot be loaded.
 */
class PortraitReturn {
  constructor(canvas, neutral, assets) {
    this.canvas=canvas;this.neutral=neutral;this.assets=assets;this.mode='loading';
    this.available=false;this.mapsReady=false;this.failure='';this.ownedURLs=[];
    this.snapshot=document.createElement('canvas');this.snapshot.width=960;this.snapshot.height=944;
    this.snapshotCtx=this.snapshot.getContext('2d',{alpha:false});
    this.frame=0;this.progress=0;this.gl=null;this.lost=false;
  }
  url(value){
    if(!value.startsWith('data:'))return value;
    const i=value.indexOf(','),raw=atob(value.slice(i+1)),bytes=new Uint8Array(raw.length);
    for(let j=0;j<raw.length;j++)bytes[j]=raw.charCodeAt(j);
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));this.ownedURLs.push(url);return url;
  }
  async initialize(){
    try {
      const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
      if(!gl)throw new Error('WebGL indisponível');
      this.gl=gl;this.canvas.width=720;this.canvas.height=708;
      this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;this.available=false;this.failure='Contexto gráfico interrompido';});
      const vertex=`attribute vec2 position;varying vec2 uv;void main(){gl_Position=vec4(position,0.,1.);uv=vec2(position.x*.5+.5,.5-position.y*.5);}`;
      const fragment=`precision highp float;
        varying vec2 uv;
        uniform sampler2D sourceImage,neutralImage,forwardMap,backwardMap;
        uniform vec2 tileOrigin,tileSize,atlasSize;
        uniform float amount,flowRange,aligned;
        vec2 field(sampler2D map,vec2 p){
          vec2 cell=(tileOrigin+vec2(.5)+clamp(p,0.,1.)*(tileSize-vec2(1.)))/atlasSize;
          return (texture2D(map,cell).rg*255.-vec2(128.))/127.*flowRange;
        }
        void main(){
          float t=clamp(amount,0.,1.);
          if(t<=.00001){gl_FragColor=vec4(texture2D(sourceImage,uv).rgb,1.);return;}
          if(t>=.99999){gl_FragColor=vec4(texture2D(neutralImage,uv).rgb,1.);return;}
          vec2 a=uv,b=uv;
          if(aligned>.5){
            for(int i=0;i<4;i++){
              a=uv-t*field(forwardMap,a);
              b=uv-(1.-t)*field(backwardMap,b);
            }
          }
          vec3 ca=texture2D(sourceImage,clamp(a,0.,1.)).rgb;
          vec3 cb=texture2D(neutralImage,clamp(b,0.,1.)).rgb;
          gl_FragColor=vec4(mix(ca,cb,t),1.);
        }`;
      const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Falha no shader');return s;};
      this.program=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);
      if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(this.program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      this.buffer=buffer;const loc=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      this.uniform={};for(const name of ['tileOrigin','tileSize','atlasSize','amount','flowRange','aligned'])this.uniform[name]=gl.getUniformLocation(this.program,name);
      this.textures=[];
      for(const [i,name] of ['sourceImage','neutralImage','forwardMap','backwardMap'].entries()){
        const tex=gl.createTexture();this.textures.push(tex);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));gl.uniform1i(gl.getUniformLocation(this.program,name),i);
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
      this.upload(1,this.neutral);this.available=true;this.mode='dissolve';
      try {
        const load=(value)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Mapa de movimento indisponível'));image.src=this.url(value);});
        const maps=await Promise.all([load(this.assets.flowForward),load(this.assets.flowBackward)]);
        if(maps.some(m=>m.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||m.height>gl.getParameter(gl.MAX_TEXTURE_SIZE)))throw new Error('Limite de textura do dispositivo');
        for(let i=0;i<2;i++)this.upload(i+2,maps[i]);
        if(gl.getError()!==gl.NO_ERROR)throw new Error('Não foi possível preparar o alinhamento');
        this.mapsReady=true;this.mode='motion-aligned';
        // Warm the shader while hidden, so the first return does not pay compilation cost.
        this.upload(0,this.neutral);this.draw(.5);this.draw(1);gl.finish();
      }catch(error){this.failure=error.message;}
    }catch(error){
      this.failure=error.message;this.gl=null;
      const replacement=this.canvas.cloneNode(false);this.canvas.replaceWith(replacement);this.canvas=replacement;
      this.canvas.width=960;this.canvas.height=944;this.fallback=this.canvas.getContext('2d',{alpha:false});this.available=!!this.fallback;this.mode=this.available?'dissolve-2d':'unavailable';
    }
    return this.available;
  }
  upload(unit,image){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,this.textures[unit]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
  capture(video,frame){
    if(!this.available||this.lost||video.readyState<2)return false;
    try {
      this.snapshotCtx.drawImage(video,0,0,960,944);
      this.frame=Math.max(0,Math.min(this.assets.frames-1,Math.round(frame)));
      if(this.gl)this.upload(0,this.snapshot);
      this.draw(0);return true;
    }catch(error){this.failure=error.message;return false;}
  }
  draw(amount){
    this.progress=Math.max(0,Math.min(1,amount));if(!this.available||this.lost)return false;
    if(this.gl){
      const gl=this.gl,m=this.assets.flow;gl.useProgram(this.program);gl.viewport(0,0,this.canvas.width,this.canvas.height);
      const x=this.frame%m.columns,y=Math.floor(this.frame/m.columns);
      gl.uniform2f(this.uniform.tileOrigin,x*m.width,y*m.height);gl.uniform2f(this.uniform.tileSize,m.width,m.height);
      gl.uniform2f(this.uniform.atlasSize,m.columns*m.width,m.rows*m.height);gl.uniform1f(this.uniform.amount,this.progress);
      gl.uniform1f(this.uniform.flowRange,m.range);gl.uniform1f(this.uniform.aligned,this.mapsReady?1:0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }else{
      const c=this.fallback;c.globalAlpha=1;c.drawImage(this.snapshot,0,0,960,944);
      c.globalAlpha=this.progress;c.drawImage(this.neutral,0,0,960,944);c.globalAlpha=1;
    }
    return true;
  }
  hide(){this.canvas.hidden=true;}
  show(){this.canvas.hidden=false;}
  dispose(){
    this.hide();this.available=false;
    for(const url of this.ownedURLs)URL.revokeObjectURL(url);
    if(this.gl){for(const texture of this.textures||[])this.gl.deleteTexture(texture);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);}
  }
}
