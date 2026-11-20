/**
 * Procedural Web Audio synthesizer for night ambience and gameplay SFX.
 */
export function createAudioController(initialVolume = 0.7) {
  let ctx = null;
  let masterGain = null;
  let volume = initialVolume;
  let ambientStarted = false;
  let ambientTimer = null;

  function ensureContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    }
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.2, freqEnd = null) {
    const c = ensureContext();
    if (!c || !masterGain || volume <= 0.001) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function startAmbience() {
    if (ambientStarted) return;
    const c = ensureContext();
    if (!c) return;
    ambientStarted = true;
    const pentatonic = [220, 261.63, 293.66, 329.63, 392.0, 440];
    let step = 0;
    ambientTimer = window.setInterval(() => {
      if (!ctx || ctx.state !== 'running' || volume <= 0.01) return;
      const note = pentatonic[(step * 3) % pentatonic.length];
      playTone(note, 1.4, 'sine', 0.035);
      step += 1;
    }, 2400);
  }

  function playCue(name) {
    switch (name) {
      case 'mote_picked':
        playTone(660, 0.14, 'sine', 0.14, 880);
        break;
      case 'deposit':
        playTone(523.25, 0.18, 'triangle', 0.16, 659.25);
        break;
      case 'lantern_lit':
        playTone(440, 0.45, 'triangle', 0.22);
        playTone(554.37, 0.55, 'sine', 0.18);
        playTone(659.25, 0.7, 'sine', 0.18);
        break;
      case 'pulse':
        playTone(330, 0.35, 'sine', 0.24, 990);
        break;
      case 'jump':
        playTone(260, 0.12, 'sine', 0.12, 420);
        break;
      case 'dash':
        playTone(480, 0.16, 'triangle', 0.16, 180);
        break;
      case 'player_hit':
        playTone(140, 0.32, 'sawtooth', 0.22, 65);
        break;
      case 'shade_spawned':
        playTone(95, 0.55, 'sawtooth', 0.12, 70);
        break;
      case 'charm_picked':
        playTone(587.33, 0.2, 'sine', 0.18, 880);
        playTone(880, 0.3, 'triangle', 0.14, 1174.66);
        break;
      case 'drifter_steal':
        playTone(520, 0.22, 'sine', 0.15, 290);
        break;
      case 'drifter_drop':
        playTone(420, 0.25, 'sine', 0.15, 680);
        break;
      case 'wind_warning':
        playTone(210, 0.7, 'sine', 0.14, 340);
        break;
      case 'countdown':
        playTone(880, 0.08, 'square', 0.09);
        break;
      case 'won':
        playTone(523.25, 0.5, 'triangle', 0.22);
        playTone(659.25, 0.6, 'triangle', 0.2);
        playTone(783.99, 0.8, 'sine', 0.2);
        break;
      case 'lost':
        playTone(293.66, 0.4, 'triangle', 0.18, 196);
        playTone(220, 0.6, 'sine', 0.18, 146.83);
        break;
      default:
        break;
    }
  }

  function dispose() {
    if (ambientTimer !== null) {
      clearInterval(ambientTimer);
      ambientTimer = null;
    }
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
    }
  }

  return {
    ensureContext,
    startAmbience,
    setVolume,
    playCue,
    dispose
  };
}
