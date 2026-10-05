(() => {
  'use strict';
  const art = document.querySelector('.hero-sequence');
  const portrait = art?.querySelector('.hero-portrait-main');
  const copy = document.querySelector('.hero-copy');
  if (!art || !portrait || !copy) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.state = 'waiting';
  canvas.dataset.count = '0';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  art.append(canvas);
  const colors = ['#ff2027', '#ff3834', '#ed101e'];
  const random = (min, max) => min + Math.random() * (max - min);
  const sprites = colors.map(color => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const paint = sprite.getContext('2d');
    const glow = paint.createRadialGradient(16,16,0,16,16,16);
    glow.addColorStop(0,color);
    glow.addColorStop(.25,color);
    glow.addColorStop(.4,color+'b0');
    glow.addColorStop(.7,color+'24');
    glow.addColorStop(1,color+'00');
    paint.fillStyle = glow;
    paint.fillRect(0,0,32,32);
    return sprite;
  });
  let points = [], bands = {left:[],right:[]}, sides = [], particles = [], bounds, imageBounds;
  let loading = null, loaded = false, visible = true, suspended = false;
  let raf = null, previous = 0, nextBirth = 0;
  const eligible = () => !reduced.matches && visible && !suspended && !document.hidden
    && art.dataset.motionState === 'complete' && !copy.classList.contains('is-copy-animating');
  const resize = () => {
    bounds = canvas.getBoundingClientRect();
    const image = portrait.getBoundingClientRect();
    imageBounds = {x:image.left-bounds.left,y:image.top-bounds.top,width:image.width,height:image.height};
    const dpr = Math.min(devicePixelRatio || 1,1.5);
    canvas.width = Math.max(1,Math.round(bounds.width*dpr));
    canvas.height = Math.max(1,Math.round(bounds.height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    particles = [];
    nextBirth = random(.5,1.2);
  };
  const loadPoints = () => {
    if (loading) return loading;
    loading = (async () => {
      await portrait.decode();
      const sample = document.createElement('canvas');
      sample.width = portrait.naturalWidth;
      sample.height = portrait.naturalHeight;
      const paint = sample.getContext('2d',{willReadFrequently:true});
      paint.drawImage(portrait,0,0);
      const {data,width,height} = paint.getImageData(0,0,sample.width,sample.height);
      const alpha = (x,y) => x<0 || y<0 || x>=width || y>=height ? 0 : data[(y*width+x)*4+3];
      // Sample both red rims. One shared timer keeps the total emission sparse;
      // choosing a side and a height band varies each isolated spark's origin.
      const rows={left:new Map(),right:new Map()};
      for (let y=0;y<height*.94;y+=2) for (let x=0;x<width;x+=2) {
        const i=(y*width+x)*4, r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
        if (a<70 || r<60 || r<g*1.7 || r<b*1.5) continue;
        const left=alpha(x-8,y), right=alpha(x+8,y), up=alpha(x,y-8), down=alpha(x,y+8);
        const side=x<width*.56 ? 'left' : 'right';
        if ((side==='left' ? left : right)>=a-50 && up>=a-50) continue;
        let nx=left-right, ny=up-down;
        const length=Math.hypot(nx,ny);
        if (length) { nx/=length; ny/=length; }
        else { nx=x<width*.5 ? -1 : 1; ny=-.3; }
        const point={x:x/width,y:y/height,nx:Math.min(-.3,nx),ny,side};
        points.push(point);
        const row=Math.floor(y/16);
        if (!rows[side].has(row)) rows[side].set(row,[]);
        rows[side].get(row).push(point);
      }
      for(const side of ['left','right']) bands[side]=[...rows[side].values()];
      sides=['left','right'].filter(side=>bands[side].length);
      loaded = true;
      canvas.dataset.emitters = String(points.length);
    })().catch(() => { canvas.dataset.state='unavailable'; });
    return loading;
  };
  const sourcePoint = () => {
    const side=sides[Math.floor(Math.random()*sides.length)];
    const band=bands[side][Math.floor(Math.random()*bands[side].length)];
    return band[Math.floor(Math.random()*band.length)];
  };
  const emit = () => {
    // A few sparks start beyond the portrait, in the right background.
    // Their longer range lets them drift across the image before fading.
    const background=Math.random()<.22;
    const source=background ? {x:random(1.02,1.12),y:random(.12,.7),side:'right',nx:-1} : sourcePoint();
    const scale=imageBounds.width/519;
    const crossing=source.side==='right';
    particles.push({
      x:imageBounds.x+source.x*imageBounds.width,
      y:imageBounds.y+source.y*imageBounds.height,
      // Right-rim sparks move inward across the portrait's foreground,
      // while the existing left-rim sparks continue drifting up and outward.
      vx:-(background ? random(55,80) : crossing ? random(30,48) : random(9,28))*scale,
      vy:(background ? random(-6,6) : -(crossing ? random(2,9) : random(16,37)))*scale,
      outward:source.nx,
      radius:random(1.05,1.9)*Math.max(.65,scale),
      distance:0,range:(background ? random(280,440) : random(14,135))*scale,fadeStart:random(.5,.8),
      age:0,phase:random(0,Math.PI*2),
      sprite:sprites[Math.floor(Math.random()*sprites.length)]
    });
  };
  const frame = now => {
    raf = requestAnimationFrame(frame);
    if (previous && now-previous<1000/30) return;
    const dt=previous ? Math.min((now-previous)/1000,.075) : 1/30;
    previous=now;
    const compact=imageBounds.width<360;
    const limit=compact ? 2 : 3;
    nextBirth-=dt;
    // Emit at most one spark, then wait a new random interval. Never catch up
    // with a batch after a slow frame or a pause.
    if (nextBirth<=0) {
      if (particles.length<limit) emit();
      nextBirth=random(compact ? 1.3 : 1,compact ? 2.8 : 2.4);
    }
    ctx.clearRect(0,0,bounds.width,bounds.height);
    ctx.globalCompositeOperation='lighter';
    particles=particles.filter(p => {
      p.age+=dt;
      const scale=imageBounds.width/519;
      const dx=(p.vx+Math.sin(p.age*2+p.phase)*6*scale)*dt, dy=p.vy*dt;
      p.distance+=Math.hypot(dx,dy);
      if (p.distance>=p.range) return false;
      p.x+=dx;
      p.y+=dy;
      p.vx+=p.outward*1.4*dt;
      p.vy-=1.5*dt;
      const remaining=Math.min(1,(1-p.distance/p.range)/(1-p.fadeStart));
      const fade=Math.min(1,p.age/.14)*remaining**1.2;
      const shimmer=.65+.35*Math.sin(p.age*7+p.phase)**2;
      ctx.globalAlpha=fade*shimmer*.9;
      const size=p.radius*6;
      ctx.drawImage(p.sprite,p.x-size/2,p.y-size/2,size,size);
      return true;
    });
    ctx.globalAlpha=1;
    canvas.dataset.count=String(particles.length);
  };
  const stop = state => {
    if (raf !== null) cancelAnimationFrame(raf);
    raf=null;
    previous=0;
    canvas.dataset.state=state;
    if (reduced.matches) {
      particles=[];
      ctx.clearRect(0,0,canvas.width,canvas.height);
      canvas.dataset.count='0';
    }
  };
  const reconcile = async () => {
    if (!eligible()) { stop(reduced.matches ? 'disabled' : 'paused'); return; }
    await loadPoints();
    if (!eligible() || raf !== null || !loaded || !points.length) return;
    resize();
    previous=0;
    canvas.dataset.state='running';
    raf=requestAnimationFrame(frame);
  };
  const motion = new MutationObserver(reconcile);
  motion.observe(art,{attributes:true,attributeFilter:['data-motion-state']});
  motion.observe(copy,{attributes:true,attributeFilter:['class']});
  if ('IntersectionObserver' in window) {
    const visibility=new IntersectionObserver(entries => { visible=entries[0].isIntersecting; reconcile(); },{threshold:.1});
    visibility.observe(portrait);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (raf !== null) resize(); }).observe(portrait);
  window.addEventListener('resize',() => { if (raf !== null) resize(); });
  window.addEventListener('pagehide',() => { suspended=true; stop('paused'); });
  window.addEventListener('pageshow',() => { suspended=false; reconcile(); });
  document.addEventListener('visibilitychange',reconcile);
  reduced.addEventListener('change',reconcile);
  reconcile();
})();
