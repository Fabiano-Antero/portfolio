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
  const colors = ['#ff3458', '#ff7042', '#ffb05a', '#ffd9a0', '#ff6ead'];
  const random = (min, max) => min + Math.random() * (max - min);
  const sprites = colors.map(color => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const paint = sprite.getContext('2d');
    const glow = paint.createRadialGradient(16,16,0,16,16,16);
    glow.addColorStop(0,'#fff5e9');
    glow.addColorStop(.1,color);
    glow.addColorStop(.24,color+'b0');
    glow.addColorStop(.55,color+'24');
    glow.addColorStop(1,color+'00');
    paint.fillStyle = glow;
    paint.fillRect(0,0,32,32);
    return sprite;
  });
  let points = [], particles = [], bounds, imageBounds;
  let loading = null, loaded = false, visible = true, suspended = false;
  let raf = null, previous = 0, carry = 0, elapsed = 0;
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
    carry = 0;
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
      // Sample only bright red pixels near transparency: the actual rim light,
      // rather than skin, clothing interiors or an estimated silhouette.
      for (let y=0;y<height*.8;y+=2) for (let x=0;x<width;x+=2) {
        const i=(y*width+x)*4, r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
        if (a<80 || r<125 || r<g*1.7 || r<b*1.5) continue;
        const left=alpha(x-8,y), right=alpha(x+8,y), up=alpha(x,y-8), down=alpha(x,y+8);
        if (Math.min(left,right,up,down)>=a-50) continue;
        let nx=left-right, ny=up-down;
        const length=Math.hypot(nx,ny);
        if (length) { nx/=length; ny/=length; }
        else { nx=x<width*.5 ? -1 : 1; ny=-.3; }
        points.push({x:x/width,y:y/height,nx,ny});
      }
      loaded = true;
      canvas.dataset.emitters = String(points.length);
    })().catch(() => { canvas.dataset.state='unavailable'; });
    return loading;
  };
  const emit = () => {
    const source=points[Math.floor(Math.random()*points.length)];
    const scale=imageBounds.width/519;
    const haze=Math.random()<.06;
    particles.push({
      x:imageBounds.x+source.x*imageBounds.width,
      y:imageBounds.y+source.y*imageBounds.height,
      vx:(source.nx*random(12,28)+random(-3,3))*scale,
      vy:(source.ny*random(5,10)-random(16,29))*scale,
      outward:source.nx,
      radius:(haze ? random(5,9) : random(.65,2))*Math.max(.65,scale),
      life:random(2.4,4.5),age:0,phase:random(0,Math.PI*2),
      sprite:sprites[Math.floor(Math.random()*sprites.length)],haze
    });
  };
  const frame = now => {
    raf = requestAnimationFrame(frame);
    if (previous && now-previous<1000/30) return;
    const dt=previous ? Math.min((now-previous)/1000,.075) : 1/30;
    previous=now;
    elapsed+=dt;
    const compact=imageBounds.width<360;
    const limit=compact ? 150 : 280;
    carry+=(compact ? 46 : 82)*dt*Math.min(1,elapsed/.6);
    while (carry>=1) {
      if (particles.length<limit) emit();
      carry--;
    }
    ctx.clearRect(0,0,bounds.width,bounds.height);
    ctx.globalCompositeOperation='lighter';
    particles=particles.filter(p => {
      p.age+=dt;
      if (p.age>=p.life) return false;
      p.x+=(p.vx+Math.sin(p.age*2+p.phase)*6)*dt;
      p.y+=p.vy*dt;
      p.vx+=p.outward*1.4*dt;
      p.vy-=1.5*dt;
      const fade=Math.min(1,p.age/.14)*Math.pow(1-p.age/p.life,.8);
      const shimmer=.65+.35*Math.sin(p.age*7+p.phase)**2;
      ctx.globalAlpha=fade*shimmer*(p.haze ? .08 : .85);
      const size=p.radius*(p.haze ? 8 : 6);
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
