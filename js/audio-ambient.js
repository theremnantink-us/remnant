/* ═══════════════════════════════════════════════════════
   REMNANT — Ambient Audio (HTML5 Audio + Web Audio gain)
   Auto-starts on first scroll. Click icon to mute/unmute.
═══════════════════════════════════════════════════════ */
const AmbientAudio = (() => {
  let audio = null, gainNode = null, ctx = null;
  let started = false, muted = false;

  function init() {
    audio = new Audio('/ambient.mp3');
    audio.loop    = true;
    audio.preload = 'auto';

    // Web Audio gain for smooth fade
    ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    gainNode  = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    src.connect(gainNode);
    gainNode.connect(ctx.destination);

    started = true;
  }

  function fadeGain(to, duration) {
    if (!gainNode) return;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(to, now + duration);
  }

  function start() {
    if (!started) init();
    ctx.resume();
    audio.play().catch(() => {});
    muted = false;
    fadeGain(0.55, 3.5);
    updateBtn();
  }

  function toggle() {
    if (!started) { start(); return; }
    ctx.resume();
    muted = !muted;
    if (muted) {
      fadeGain(0, 1.5);
      setTimeout(() => { if (muted) audio.pause(); }, 1600);
    } else {
      audio.play().catch(() => {});
      fadeGain(0.55, 1.5);
    }
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById('sound-btn');
    if (!btn) return;
    btn.classList.toggle('snd-active', !muted);
    btn.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    btn.setAttribute('title',      muted ? 'Включить звук' : 'Выключить звук');
  }

  // Auto-start on first meaningful scroll
  let scrollFired = false;
  window.addEventListener('scroll', () => {
    if (scrollFired || window.scrollY < 30) return;
    scrollFired = true;
    start();
  }, { passive: true });

  return { toggle, start };
})();
