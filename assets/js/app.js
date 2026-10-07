(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.comparison').forEach(comparison => {
    const control = comparison.querySelector('.comparison-control');
    if (!control) return;
    const update = () => {
      const value = Number(control.value);
      comparison.style.setProperty('--comparison-position', value + '%');
      control.setAttribute('aria-valuetext', document.documentElement.lang === 'en'
        ? `Light theme: ${value}%. Dark theme: ${100 - value}%.`
        : document.documentElement.lang === 'es' ? `Tema claro: ${value}%. Tema oscuro: ${100 - value}%.`
        : `Tema claro: ${value}%. Tema escuro: ${100 - value}%.`);
    };
    let dragging = false;
    const move = event => {
      const bounds = comparison.getBoundingClientRect();
      control.value = Math.round(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)));
      update();
    };
    control.addEventListener('input', update);
    document.addEventListener('portfolio:language', update);
    control.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      control.focus({ preventScroll: true });
      control.setPointerCapture(event.pointerId);
      move(event);
    });
    control.addEventListener('pointermove', event => { if (dragging) move(event); });
    const stop = () => { dragging = false; };
    control.addEventListener('pointerup', stop);
    control.addEventListener('pointercancel', stop);
    control.addEventListener('lostpointercapture', stop);
    update();
  });
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { document.documentElement.classList.remove('motion-ready'); observer.disconnect(); } });
  }
  document.querySelectorAll('[role="tablist"]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const activate = tab => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden = !selected;
        panel.classList.remove('panel-enter');
        if (selected && !reducedMotion.matches) { void panel.offsetWidth; panel.classList.add('panel-enter'); }
      });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); activate(tabs[next]); tabs[next].focus();
      });
    });
  });
  // Anchor destinations remain keyboard-accessible after smooth scrolling.
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }));
})();
