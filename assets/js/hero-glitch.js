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
  let titleReady = false;
  const random = (min, max) => min + Math.random() * (max - min);
  const titleFinished = () => {
    if(titleReady)return true;
    const lastLine = title.querySelector('.hero-writing:last-child');
    const fill = lastLine?.querySelector('.hero-letter-fill');
    titleReady = !!fill && !lastLine.classList.contains('is-writing-preparing') && Number(getComputedStyle(fill).opacity) >= .99;
    return titleReady;
  };
  const eligible = () => loaded && visible && !suspended && !document.hidden && !reduced.matches
    && titleFinished();
  const clearEffect = () => {
    clearTimeout(cleanup);
    cleanup = null;
    title.classList.remove('is-glitching');
    title.style.removeProperty('--glitch-duration');
    title.style.removeProperty('--glitch-jolt');
    title.querySelectorAll('.hero-glitch-svg').forEach(svg => svg.remove());
  };
  const stop = () => {
    clearTimeout(pending);
    pending = null;
    clearEffect();
  };
  const schedule = () => {
    if (!eligible() || pending !== null || cleanup !== null) return;
    // Start as soon as the title is drawn, without waiting for the portrait.
    pending = setTimeout(burst, first ? random(150, 450) : random(4000, 8500));
  };
  const burst = () => {
    pending = null;
    if (!eligible()) return;
    const duration = random(420, 560);
    let layers = 0;
    const lines=[...title.querySelectorAll('.hero-writing')];
    const fontSizes=lines.map(line=>parseFloat(getComputedStyle(line).fontSize));
    lines.forEach((line, lineIndex) => {
      const source = line.querySelector('.hero-writing-svg');
      if (!source) return;
      const fontSize = fontSizes[lineIndex];
      const shift = random(fontSize * .16, fontSize * .26);
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
    title.style.setProperty('--glitch-duration', `${duration}ms`);
    title.style.setProperty('--glitch-jolt', `${random(2, 4)}px`);
    title.classList.add('is-glitching');
    cleanup = setTimeout(() => { clearEffect(); schedule(); }, duration + 60);
  };
  const reconcile = () => { if (eligible()) schedule(); else stop(); };
  title.addEventListener('animationend', reconcile);
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
