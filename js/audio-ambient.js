/* ═══════════════════════════════════════════════════════════
   REMNANT — Ambient Audio Engine  (Web Audio API)
   Dark atmospheric soundscape: drone · noise · slow melody
   Starts on first scroll, toggle via #sound-btn
═══════════════════════════════════════════════════════════ */
const AmbientAudio = (() => {
  let ctx, masterGain, reverbSend, reverbReturn;
  let playing = false, muted = false, inited = false;

  /* ── Schroeder reverb via feedback comb + allpass ──────── */
  function buildReverb() {
    const combDelays = [0.0297, 0.0371, 0.0411, 0.0437, 0.0517, 0.0557];
    const apDelays   = [0.0090, 0.0124];

    const input  = ctx.createGain();
    const output = ctx.createGain();
    input.gain.value  = 1;
    output.gain.value = 0.28;

    const wet = ctx.createGain();
    wet.gain.value = 1;

    // Comb filters (parallel)
    combDelays.forEach(t => {
      const delay = ctx.createDelay(1.0);
      const fb    = ctx.createGain();
      const filt  = ctx.createBiquadFilter();
      delay.delayTime.value = t;
      fb.gain.value    = 0.82;
      filt.type        = 'lowpass';
      filt.frequency.value = 3500;
      input.connect(delay);
      delay.connect(filt);
      filt.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
    });

    // Allpass (series)
    let prev = wet;
    apDelays.forEach(t => {
      const ap = ctx.createDelay(0.5);
      const fb = ctx.createGain();
      ap.delayTime.value = t;
      fb.gain.value = -0.7;
      prev.connect(ap);
      ap.connect(fb);
      fb.connect(ap);
      ap.connect(output);
      prev = ap;
    });

    return { input, output };
  }

  /* ── Drone: root + fifth + octave, slow LFO vibrato ─────── */
  function buildDrone(rev) {
    // A1 = 55, E2 = 82.41, A2 = 110, E3 = 164.81, A3 = 220
    const layers = [
      { f: 55,     type: 'sawtooth', gain: 0.22, lfoRate: 0.06, lfoDepth: 0.08, lpFreq: 180 },
      { f: 82.41,  type: 'sine',     gain: 0.10, lfoRate: 0.08, lfoDepth: 0.05, lpFreq: 400 },
      { f: 110,    type: 'sine',     gain: 0.12, lfoRate: 0.05, lfoDepth: 0.04, lpFreq: 600 },
      { f: 164.81, type: 'sine',     gain: 0.06, lfoRate: 0.10, lfoDepth: 0.03, lpFreq: 900 },
      { f: 220,    type: 'triangle', gain: 0.04, lfoRate: 0.12, lfoDepth: 0.02, lpFreq: 1200 },
    ];

    layers.forEach(({ f, type, gain: g, lfoRate, lfoDepth, lpFreq }) => {
      const osc   = ctx.createOscillator();
      const lfo   = ctx.createOscillator();
      const lfoG  = ctx.createGain();
      const filt  = ctx.createBiquadFilter();
      const gainN = ctx.createGain();

      osc.type = type;
      osc.frequency.value = f;
      lfo.frequency.value = lfoRate;
      lfoG.gain.value     = f * lfoDepth;
      filt.type           = 'lowpass';
      filt.frequency.value = lpFreq;
      filt.Q.value = 0.8;
      gainN.gain.value    = g;

      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      osc.connect(filt);
      filt.connect(gainN);
      gainN.connect(masterGain);
      gainN.connect(rev.input);

      lfo.start();
      osc.start();
    });
  }

  /* ── Atmosphere: bandpass filtered white noise ──────────── */
  function buildNoise(rev) {
    const seconds = 8;
    const buf  = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src   = ctx.createBufferSource();
    src.buffer  = buf;
    src.loop    = true;

    const bp    = ctx.createBiquadFilter();
    bp.type     = 'bandpass';
    bp.frequency.value = 320;
    bp.Q.value  = 0.6;

    const lp    = ctx.createBiquadFilter();
    lp.type     = 'lowpass';
    lp.frequency.value = 800;

    const gainN = ctx.createGain();
    gainN.gain.value = 0.022;

    src.connect(bp);
    bp.connect(lp);
    lp.connect(gainN);
    gainN.connect(masterGain);
    gainN.connect(rev.input);
    src.start();
  }

  /* ── Melody: slow haunting pentatonic notes ─────────────── */
  function buildMelody(rev) {
    // A minor pentatonic: A C D E G  (two octaves)
    const scale = [110, 130.81, 146.83, 164.81, 196,
                   220, 261.63, 293.66, 329.63, 392, 440];

    function scheduleNote() {
      if (!playing) return;
      const freq     = scale[Math.floor(Math.random() * scale.length)];
      const detune   = (Math.random() - 0.5) * 4; // slight pitch drift
      const dur      = 4 + Math.random() * 5;
      const attack   = 1.2 + Math.random() * 0.8;
      const vol      = 0.04 + Math.random() * 0.03;

      const osc  = ctx.createOscillator();
      const env  = ctx.createGain();
      const filt = ctx.createBiquadFilter();

      osc.type = Math.random() > 0.3 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value    = detune;

      filt.type = 'lowpass';
      filt.frequency.value = 1400 + Math.random() * 600;

      const now = ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(vol, now + attack);
      env.gain.setValueAtTime(vol, now + dur * 0.5);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(filt);
      filt.connect(env);
      env.connect(rev.input);      // melody goes mostly to reverb
      env.connect(masterGain);     // small dry signal

      osc.start(now);
      osc.stop(now + dur + 0.1);

      const gap = 3500 + Math.random() * 7000;
      setTimeout(scheduleNote, gap);
    }

    setTimeout(scheduleNote, 2500);
  }

  /* ── Init audio graph ───────────────────────────────────── */
  function init() {
    ctx        = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const rev = buildReverb();
    rev.output.connect(ctx.destination);

    buildDrone(rev);
    buildNoise(rev);
    buildMelody(rev);

    inited = true;
  }

  /* ── Public controls ────────────────────────────────────── */
  function start() {
    if (!inited) init();
    ctx.resume();
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.42, now + 3.5);
    playing = true;
    muted   = false;
    updateBtn();
  }

  function toggleMute() {
    if (!inited) { start(); return; }
    ctx.resume();
    muted = !muted;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.42, now + 1.8);
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById('sound-btn');
    if (!btn) return;
    btn.classList.toggle('snd-active', playing && !muted);
    btn.setAttribute('aria-label', (playing && !muted) ? 'Выключить звук' : 'Включить звук');
  }

  /* ── Auto-start on first scroll ─────────────────────────── */
  let scrollFired = false;
  window.addEventListener('scroll', () => {
    if (scrollFired || window.scrollY < 20) return;
    scrollFired = true;
    start();
  }, { passive: true });

  return { toggle: toggleMute };
})();
