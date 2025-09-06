(function () {
  // Ano dinâmico no footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Filtro de projetos
  const btns  = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('#projGrid .project');

  btns.forEach(b => {
    b.addEventListener('click', () => {
      const f = b.getAttribute('data-filter');
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');

      cards.forEach(c => {
        const tags = (c.dataset.tags || '').split(',').map(s => s.trim());
        const show = f === 'all' || tags.includes(f);
        c.style.display = show ? '' : 'none';
      });
    });
  });

  // Scroll suave para âncoras do navbar/CTA
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Form “fake submit”
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      alert('Obrigado! Eu retornarei em breve.');
      form.reset();
    });
  }
})();
