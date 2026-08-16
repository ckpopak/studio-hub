/**
 * Lightweight SFX via Web Audio API (no external audio assets required).
 */
const Sfx = (() => {
  let ctx = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = "sine", gain = 0.12) {
    const audio = ensureCtx();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    unlock() {
      ensureCtx();
    },
    correct() {
      tone(660, 0.12, "triangle", 0.1);
      setTimeout(() => tone(880, 0.16, "triangle", 0.1), 90);
    },
    wrong() {
      tone(220, 0.22, "sawtooth", 0.07);
    },
    beat() {
      tone(520, 0.06, "sine", 0.05);
    },
  };
})();

window.Sfx = Sfx;
