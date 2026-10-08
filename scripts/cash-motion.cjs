// Shared by the case generator and the published Cash Advance page.
module.exports = `<figure class="cash-motion reveal" aria-labelledby="cash-motion-caption">
  <div class="cash-motion-player">
    <video id="cash-motion-video" width="1920" height="1080" controls playsinline preload="none" poster="assets/media/cash-advance-motion-poster.webp" aria-label="Apresentação do Cash Advance" aria-describedby="cash-motion-description">
      <source src="assets/media/cash-advance-motion.mp4?v=20261008-final" type="video/mp4">
      <a href="assets/media/cash-advance-motion.mp4">Abrir vídeo do Cash Advance</a>
    </video>
    <button class="button cash-motion-toggle" type="button" aria-controls="cash-motion-video" hidden><svg data-motion-play width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 4.5v15L20 12z"/></svg><svg data-motion-pause width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" hidden><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg><span class="cash-motion-label" data-motion-play>Reproduzir</span><span class="cash-motion-label" data-motion-pause hidden>Pausar</span></button>
  </div>
  <figcaption id="cash-motion-caption"><span class="mono">VISÃO DO PRODUTO · 16 S</span><span id="cash-motion-description">Home, antecipação, Pix e Caixinhas em movimento.</span></figcaption>
</figure>`;
