(() => {
  'use strict';
  const title = document.querySelector('.hero-title');
  const art = document.querySelector('.hero-sequence');
  const copy = document.querySelector('.hero-copy');
  if (!title || !art || !copy) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let loaded = document.readyState === 'complete';
  let visible = true;
  let suspended = false;
  let first = true;
  let pending = null;
  let cleanup = null;
  let run = 0;
  const random = (min, max) => min + Math.random() * (max - min);
  const eligible = () => loaded && visible && !suspended && !document.hidden && !reduced.matches
    && art.dataset.motionState === 'complete' && !copy.classList.contains('is-copy-animating');
  const clearEffect = () => {
    clearTimeout(cleanup);
    cleanup = null;
    title.classList.remove('is-glitching');
    title.querySelectorAll('.hero-glitch-svg').forEach(svg => svg.remove());
  };
  const stop = () => {
    clearTimeout(pending);
    pending = null;
    clearEffect();
  };
  const schedule = () => {
    if (!eligible() || pending !== null || cleanup !== null) return;
    // Brief bursts, with an unpredictable pause; the opening finishes first.
    pending = setTimeout(burst, first ? random(6000, 12000) : random(18000, 38000));
  };
  const burst = () => {
    pending = null;
    if (!eligible()) return;
    const duration = random(280, 380);
    let layers = 0;
    title.querySelectorAll('.hero-writing').forEach((line, lineIndex) => {
      const source = line.querySelector('.hero-writing-svg');
      if (!source) return;
      const shift = random(3, 7);
      ['#22ddff', '#f331da', '#fff7bf'].forEach((color, channel) => {
        const svg = source.cloneNode(true);
        const suffix = `-glitch-${++run}-${lineIndex}-${channel}`;
        // Outline masks keep the exact source glyphs, using unique SVG IDs.
        svg.querySelectorAll('[id]').forEach(node => {
          const id = node.id;
          node.id += suffix;
          svg.querySelectorAll('[mask],[filter]').forEach(ref => {
            for (const name of ['mask', 'filter']) {
              if (ref.getAttribute(name) === `url(#${id})`) ref.setAttribute(name, `url(#${id}${suffix})`);
            }
          });
        });
        svg.setAttribute('class', 'hero-glitch-svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.querySelectorAll('.hero-letter').forEach(path => path.setAttribute('class', 'hero-glitch-glyph'));
        svg.querySelectorAll('.hero-letter-fill').forEach(path => path.setAttribute('class', 'hero-glitch-fill'));
        svg.style.setProperty('--glitch-color', color);
        svg.style.setProperty('--glitch-shift', `${shift * (channel === 1 ? -1 : 1)}px`);
        svg.style.setProperty('--glitch-duration', `${duration}ms`);
        line.append(svg);
        layers++;
      });
    });
    if (!layers) { schedule(); return; }
    first = false;
    title.classList.add('is-glitching');
    cleanup = setTimeout(() => { clearEffect(); schedule(); }, duration + 60);
  };
  const reconcile = () => { if (eligible()) schedule(); else stop(); };
  const observer = new MutationObserver(reconcile);
  observer.observe(art, {attributes:true, attributeFilter:['data-motion-state']});
  observer.observe(copy, {attributes:true, attributeFilter:['class']});
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      reconcile();
    }, {threshold:0});
    visibility.observe(title);
  }
  window.addEventListener('load', () => { loaded = true; reconcile(); }, {once:true});
  window.addEventListener('pagehide', () => { suspended = true; stop(); });
  window.addEventListener('pageshow', () => { suspended = false; reconcile(); });
  document.addEventListener('visibilitychange', reconcile);
  reduced.addEventListener('change', reconcile);
  document.addEventListener('portfolio:language', () => { stop(); schedule(); });
  reconcile();
})();
