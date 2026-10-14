(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  if (!header) return;
  const brand = header.querySelector('.brand');
  const sections = [...document.querySelectorAll('main > section,.site-footer')];
  let frame = 0, currentSection = null, scrolled = null, navbarHeight = 0;

  // Transparent sections inherit the first solid background of their ancestors.
  function background(element) {
    for (let node = element; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      const rgba = color.match(/[\d.]+/g)?.map(Number);
      if (rgba?.length >= 3 && (rgba.length === 3 || rgba[3] > .9)) return rgba.slice(0, 3);
    }
    return [16, 17, 20];
  }
  function setTheme(section) {
    const rgb = background(section);
    const channels = rgb.map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    const light = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 > .179;
    const warm = rgb[0] > rgb[1] * 1.25;
    header.style.setProperty('--nav-background', `rgb(${rgb.join(',')})`);
    header.style.setProperty('--nav-glass', `rgba(${rgb.join(',')},.88)`);
    header.style.setProperty('--nav-text', light ? '#101114' : '#ffffff');
    header.style.setProperty('--nav-muted', light ? '#38393d' : '#b9babd');
    header.style.setProperty('--nav-accent', light ? (warm ? '#101114' : '#a73513') : '#ff6b3d');
    header.dataset.navTheme = light ? 'light' : 'dark';
  }
  function update() {
    frame = 0;
    const bounds = header.getBoundingClientRect();
    const brandBounds = brand.getBoundingClientRect();
    // Use the closed navbar row, even while the mobile menu is expanded.
    const height = Math.round((brandBounds.top + brandBounds.height / 2 - bounds.top) * 2);
    // Follow the section in the main viewing area, including short final sections.
    const probe = window.scrollY > 1 ? Math.max(height, window.innerHeight / 2) : 0;
    let section = sections[0] || document.body;
    for (const candidate of sections) {
      if (candidate.getBoundingClientRect().top > probe) break;
      section = candidate;
    }
    const isScrolled = window.scrollY > 1;
    if (height !== navbarHeight) {
      navbarHeight = height;
      document.documentElement.style.setProperty('--navbar-height', `${height}px`);
    }
    if (section !== currentSection) {
      currentSection = section;
      setTheme(section);
    }
    if (isScrolled !== scrolled) {
      scrolled = isScrolled;
      header.classList.toggle('is-scrolled', scrolled);
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  document.addEventListener('portfolio:language', schedule);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    document.querySelector('main') && observer.observe(document.querySelector('main'));
  }
  update();
})();
