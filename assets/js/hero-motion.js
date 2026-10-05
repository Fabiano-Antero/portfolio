(() => {
  const art = document.querySelector('.hero-sequence');
  if (!art) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const copy = document.querySelector('.hero-copy');
  const following = [...copy.querySelectorAll(':scope > .hero-enter:not(.actions), :scope > .actions > a')];
  const writings = [...document.querySelectorAll('.hero-writing')];
  const letterDuration = .3, letterStagger = .05, fillDuration = .09, linePause = .09;
  copy.style.setProperty('--letter-duration', `${letterDuration}s`);
  copy.style.setProperty('--letter-stagger', `${letterStagger}s`);
  copy.style.setProperty('--letter-fill-duration', `${fillDuration}s`);
  let titleRun = 0;
  let letteringResizes = [];
  // Reserve the same time for each translated line so the supporting content
  // keeps its original schedule when the language changes during the reveal.
  const titleVariants = [['DA LÓGICA', 'FROM LOGIC'], ['AO PRODUTO', 'TO PRODUCT'], ['EM USO.', 'IN USE.']];
  const drawTitle = async ({preserveMotion = false} = {}) => {
    if (!writings.length || !window.heroLettering) return;
    const previousAnimations = preserveMotion ? writings.flatMap(writing => writing.getAnimations({subtree:true})) : [];
    const previousAnimation = previousAnimations[0];
    // Finished CSS animations clamp their time at their own end. The longest
    // title animation carries the progress of the full three-line sequence.
    const previousTimes = previousAnimations.map(animation => animation.currentTime).filter(time => time != null);
    const previousTime = previousTimes.length ? Math.max(...previousTimes) : null;
    const keepPaused = previousAnimation?.playState === 'paused' && !writings[0].classList.contains('is-writing-preparing');
    const animate = !reduced.matches && (!preserveMotion || previousTime != null);
    const run = ++titleRun;
    if (!preserveMotion) copy.classList.remove('is-copy-animating', 'is-copy-preparing');
    letteringResizes.forEach(observer => observer.disconnect());
    letteringResizes = [];
    let lineDelay = .06;
    const fontSizes=writings.map(writing=>parseFloat(getComputedStyle(writing).fontSize));
    writings.forEach((writing, lineIndex) => {
      const word = writing.querySelector('.hero-writing-label').textContent.trim();
      const lettering = window.heroLettering[word];
      if (!lettering) return;
      const solid = writing.classList.contains('hero-writing-solid');
      const letterCount = Math.max(...titleVariants[lineIndex].map(text => window.heroLettering[text].paths.length));
      const lineEnd = lineDelay + letterDuration + (letterCount - 1) * letterStagger;
      writing.style.setProperty('--line-delay', `${lineDelay}s`);
      writing.style.setProperty('--line-end', `${lineEnd}s`);
      lineDelay = lineEnd + (solid ? fillDuration : 0) + linePause;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', lettering.viewBox);
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('hero-writing-svg');
      svg.style.width = `${lettering.width / 1000}em`;
      svg.style.height = `${lettering.height / 1000}em`;
      // The font uses overlapping contours. Keep strokes only on the visible
      // silhouette so shared component edges do not appear inside a letter.
      const filterId = `letter-outline-${run}-${lineIndex}`;
      const maskId = `letter-mask-${run}-${lineIndex}`;
      const defs = document.createElementNS(svg.namespaceURI, 'defs');
      defs.innerHTML = `<filter id="${filterId}" x="-10%" y="-20%" width="120%" height="140%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="10" result="outer"/><feMorphology in="SourceAlpha" operator="erode" radius="10" result="inner"/><feComposite in="outer" in2="inner" operator="out"/></filter><mask id="${maskId}" maskUnits="userSpaceOnUse" x="-100" y="0" width="7000" height="1200" style="mask-type:alpha"><path d="${lettering.paths.join(' ')}" fill="white" stroke="none" filter="url(#${filterId})"/></mask>`;
      svg.append(defs);
      lettering.paths.forEach((d, index) => {
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', d);
        path.setAttribute('pathLength', '1');
        path.setAttribute('mask', `url(#${maskId})`);
        path.classList.add('hero-letter');
        path.style.setProperty('--letter-index', index);
        svg.append(path);
      });
      if (solid) {
        const fill = document.createElementNS(svg.namespaceURI, 'path');
        fill.setAttribute('d', lettering.paths.join(' '));
        fill.classList.add('hero-letter-fill');
        svg.append(fill);
      }
      writing.querySelector('svg')?.remove();
      writing.classList.remove('is-writing', 'is-writing-preparing');
      writing.append(svg);
      let previousFontSize;
      const sizeMask = (fontSize= parseFloat(getComputedStyle(writing).fontSize)) => {
        if(previousFontSize===fontSize)return;
        previousFontSize=fontSize;
        const radius = 1200 / fontSize;
        svg.querySelectorAll('feMorphology').forEach(node => node.setAttribute('radius', radius));
      };
      sizeMask(fontSizes[lineIndex]);
      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(()=>sizeMask());
        observer.observe(writing);
        letteringResizes.push(observer);
      }
      writing.classList.add('has-lettering');
      if (animate) writing.classList.add('is-writing', 'is-writing-preparing');
    });
    // Each supporting element starts after the title has finished, including
    // its final fill. Buttons enter individually in their document order.
    if (!preserveMotion) {
      following.forEach((element, index) => {
        element.classList.add('hero-follow');
        element.style.setProperty('--follow-delay', `${lineDelay + index * .48}s`);
      });
      if (animate) copy.classList.add('is-copy-animating', 'is-copy-preparing');
    }
    // New glyphs need new paths, but inherit the existing animation time.
    // Restore it while paused, before the browser can paint a hidden title.
    const translatedAnimations = animate && preserveMotion ? writings.flatMap(writing => writing.getAnimations({subtree:true})) : [];
    translatedAnimations.forEach(animation => { animation.currentTime = previousTime; });
    await document.fonts.ready;
    if (run !== titleRun) return;
    writings.forEach(writing => writing.classList.remove('is-writing-preparing'));
    if (keepPaused) translatedAnimations.forEach(animation => animation.pause());
    if (!preserveMotion) copy.classList.remove('is-copy-preparing');
  };
  following.at(-1)?.addEventListener('animationend', event => {
    if (event.animationName === 'hero-copy-enter') copy.classList.remove('is-copy-animating');
  });
  drawTitle();
  document.addEventListener('portfolio:language', () => drawTitle({preserveMotion:true}));
  let observer;
  const finish = () => {
    art.classList.remove('is-preparing', 'is-animating');
    art.dataset.motionState = 'complete';
    writings.forEach(writing => writing.classList.remove('is-writing', 'is-writing-preparing'));
    copy.classList.remove('is-copy-animating', 'is-copy-preparing');
    observer?.disconnect();
  };
  if (reduced.matches) { finish(); return; }
  art.classList.add('is-preparing');
  art.dataset.motionState = 'preparing';
  const ready = Promise.all([
    document.fonts.ready,
    ...[...art.querySelectorAll('img')].map(img => img.decode().catch(() => {}))
  ]);
  const start = async () => {
    observer?.disconnect();
    await ready;
    if (reduced.matches) { finish(); return; }
    art.classList.remove('is-preparing');
    art.classList.add('is-animating');
    art.dataset.motionState = 'running';
  };
  // The ambient light now enters with the ring; the last skill still finishes last.
  const lastLayer = art.querySelector('.hero-skills-list li:last-child .hero-skill-text');
  lastLayer.addEventListener('animationend', event => {
    if (event.animationName === 'hero-layer-fade') art.dataset.motionState = 'complete';
  });
  reduced.addEventListener('change', () => { if (reduced.matches) finish(); });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) start();
    }, { threshold: .2 });
    observer.observe(art);
  } else start();
})();
