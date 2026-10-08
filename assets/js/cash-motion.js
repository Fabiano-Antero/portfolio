(() => {
  'use strict';
  const video = document.querySelector('#cash-motion-video');
  const toggle = document.querySelector('.cash-motion-toggle');
  if (!video || !toggle) return;

  // Native controls remain the fallback when JavaScript is unavailable.
  toggle.hidden = false;
  const update = () => {
    const playing = !video.paused && !video.ended;
    video.closest('.cash-motion-player').dataset.playing = String(playing);
    toggle.querySelectorAll('[data-motion-play]').forEach(node => { node.toggleAttribute('hidden', playing); });
    toggle.querySelectorAll('[data-motion-pause]').forEach(node => { node.toggleAttribute('hidden', !playing); });
  };
  toggle.addEventListener('click', async () => {
    if (!video.paused && !video.ended) { video.pause(); return; }
    try {
      await video.play();
    } catch {
      // Leave the native controls available and the button ready to retry.
      update();
    }
  });
  ['play','pause','ended','error'].forEach(event => video.addEventListener(event, update));
  update();
})();
