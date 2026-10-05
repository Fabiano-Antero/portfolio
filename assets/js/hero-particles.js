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
    glow.addColorStop(.16,color);
    glow.addColorStop(.24,color+'b0');
    glow.addColorStop(.55,color+'24');
    glow.addColorStop(1,color+'00');
    paint.fillStyle = glow;
    paint.fillRect(0,0,32,32);
    return sprite;
  });
  let points = [], bands = [], particles = [], bounds, imageBounds;
  let loading = null, loaded = false, visible = true, suspended = false;
  let raf = null, previous = 0, nextBirth = 0, elapsed = 0;
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
    nextBirth = 0;
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
      // Only the left shoulder-to-arm rim emits. Include its dim lower red
      // edge, and distribute births by height so the whole arm contributes.
      const rows=new Map();
      for (let y=Math.ceil(height*.56);y<height*.94;y+=2) for (let x=0;x<width*.33;x+=2) {
        const i=(y*width+x)*4, r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
        if (a<70 || r<60 || r<g*1.7 || r<b*1.5) continue;
        const left=alpha(x-8,y), right=alpha(x+8,y), up=alpha(x,y-8), down=alpha(x,y+8);
        if (left>=a-50) continue;
        let nx=left-right, ny=up-down;
        const length=Math.hypot(nx,ny);
        if (length) { nx/=length; ny/=length; }
        else { nx=x<width*.5 ? -1 : 1; ny=-.3; }
        const point={x:x/width,y:y/height,nx:Math.min(-.3,nx),ny};
        points.push(point);
        const row=Math.floor(y/16);
        if (!rows.has(row)) rows.set(row,[]);
        rows.get(row).push(point);
      }
      bands=[...rows.values()];
      loaded = true;
      canvas.dataset.emitters = String(points.length);
    })().catch(() => { canvas.dataset.state='unavailable'; });
    return loading;
  };
  const sourcePoint = () => {
    const band=bands[Math.floor(Math.random()*bands.length)];
    return band[Math.floor(Math.random()*band.length)];
  };
  const emit = () => {
    const source=sourcePoint();
    const scale=imageBounds.width/519;
    particles.push({
      x:imageBounds.x+source.x*imageBounds.width,
      y:imageBounds.y+source.y*imageBounds.height,
      vx:-random(9,28)*scale,
      vy:-random(16,37)*scale,
      outward:source.nx,
      radius:random(.35,1)*Math.max(.65,scale),
      distance:0,range:random(14,135)*scale,fadeStart:random(.5,.8),
      age:0,phase:random(0,Math.PI*2),
      sprite:sprites[Math.floor(Math.random()*sprites.length)]
    });
  };
  const frame = now => {
    raf = requestAnimationFrame(frame);
    if (previous && now-previous<1000/30) return;
    const dt=previous ? Math.min((now-previous)/1000,.075) : 1/30;
    previous=now;
    elapsed+=dt;
    const compact=imageBounds.width<360;
    const limit=compact ? 90 : 150;
    const ramp=Math.min(1,elapsed/.8);
    nextBirth-=dt*ramp;
    // Random arrival times leave irregular gaps and occasional small clusters.
    while (nextBirth<=0) {
      if (particles.length<limit) emit();
      nextBirth+=Math.max(.003,-Math.log(Math.max(.0001,Math.random()))/(compact ? 28 : 42));
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
    elapsed=0;
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
