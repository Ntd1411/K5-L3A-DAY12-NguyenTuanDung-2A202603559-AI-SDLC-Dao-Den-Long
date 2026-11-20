import './style.css';
import contract from '../../game.contract.json';
import {
  SIM_DT,
  computeBenchMetrics,
  createSimulationState,
  getMapConfig,
  serializeSnapshot,
  stepSimulation
} from '../sim/index.js';
import { createRenderApp } from './render/app.js';
import { createWorldView } from './render/world.js';
import { createHud } from './ui/hud.js';
import { createWebInputController } from './input.js';
import { loadSettings, saveSettings } from './settings.js';
import { createAudioController } from './audio.js';
import { fetchLeaderboard, submitLeaderboardScore } from './leaderboard.js';
import { createDemoBot } from './demo-bot.js';

const canvas = document.getElementById('game-canvas');
const hudRoot = document.getElementById('hud-root');
const params = new URLSearchParams(window.location.search);
const isBenchMode = params.get('bench') === '1';
const benchSeed = Number(params.get('seed')) || 42;
const benchDurationS = Number(params.get('duration')) || 30;

const settings = loadSettings();
if (params.get('light') === '1') settings.lightMode = true;

const renderApp = createRenderApp(canvas);
const audio = createAudioController(settings.volume);
const input = createWebInputController({
  initialYawDeg: 0,
  sensitivity: settings.sensitivity,
  keyBindings: settings.keyBindings
});
if (!isBenchMode) {
  input.attachWindowListeners(window, canvas);
}

let currentNight = 1;
let nightScores = { 1: 0, 2: 0, 3: 0 };
let nightsWonCount = 0;
let currentSeed = 42;
let uiPhase = isBenchMode ? 'bench' : 'menu';
let settingsReturnPhase = 'menu';
let lastCountdownSec = -1;
let prevWindWarning = false;
let isAutoDemo = false;
const demoBot = createDemoBot();

function getTotalScore() {
  return nightScores[1] + nightScores[2] + nightScores[3];
}

let sim = createSimulationState({
  night: currentNight,
  seed: isBenchMode ? benchSeed : 42,
  tuning: contract.tuning,
  benchMode: isBenchMode
});
const worldView = createWorldView(renderApp.scene, sim, renderApp.camera);

function startNight(nightNum) {
  currentNight = nightNum;
  nightScores[currentNight] = 0;
  currentSeed = 42 + (currentNight - 1) * 101;
  sim = createSimulationState({
    night: currentNight,
    seed: currentSeed,
    tuning: contract.tuning,
    moteMultiplier: 4
  });
  input.setCamYawDeg(0);
  worldView.rebuildForSim(sim);
  worldView.sync(sim, 0, SIM_DT);
  lastCountdownSec = -1;
  prevWindWarning = false;
  uiPhase = 'playing';
  hud.setScreen('playing');
  audio.startAmbience();
}

function togglePause() {
  if (uiPhase === 'playing' && sim.state === 'playing') {
    sim.prevInput.pause = false;
    stepSimulation(sim, { pause: true });
    sim.prevInput.pause = false;
    uiPhase = 'paused';
    hud.setScreen('paused');
  } else if (uiPhase === 'paused' && sim.state === 'paused') {
    sim.prevInput.pause = false;
    stepSimulation(sim, { pause: true });
    sim.prevInput.pause = false;
    uiPhase = 'playing';
    hud.setScreen('playing');
  }
}

input.setOnPauseToggle(togglePause);

function applyLightMode(enabled) {
  settings.lightMode = Boolean(enabled);
  saveSettings(settings);
  renderApp.setLightMode(settings.lightMode);
  worldView.setLightMode(settings.lightMode);
  hud.setLightModeLabel(settings.lightMode);
}

function applyAccessiblePalette(enabled) {
  settings.accessiblePalette = Boolean(enabled);
  saveSettings(settings);
  worldView.setAccessiblePalette(settings.accessiblePalette);
  hud.setAccessiblePalette(settings.accessiblePalette);
}

function applyReduceMotion(enabled) {
  settings.reduceMotion = Boolean(enabled);
  saveSettings(settings);
  hud.setReduceMotion(settings.reduceMotion);
}

function applyLargeText(enabled) {
  settings.largeText = Boolean(enabled);
  saveSettings(settings);
  hud.setLargeText(settings.largeText);
}

const hud = createHud(hudRoot, {
  onStartGame: () => {
    audio.ensureContext();
    isAutoDemo = false;
    hud.setDemoActive(false);
    nightScores = { 1: 0, 2: 0, 3: 0 };
    nightsWonCount = 0;
    currentNight = 1;
    uiPhase = 'intro';
    hud.showIntro(1, getMapConfig(1));
  },
  onStartDemo: () => {
    audio.ensureContext();
    isAutoDemo = true;
    demoBot.reset();
    nightScores = { 1: 0, 2: 0, 3: 0 };
    nightsWonCount = 0;
    hud.setDemoActive(true);
    startNight(1);
  },
  onStopDemo: () => {
    isAutoDemo = false;
    hud.setDemoActive(false);
    uiPhase = 'menu';
    hud.setScreen('menu');
  },
  onNextDemo: () => {
    if (!isAutoDemo) return;
    demoBot.reset();
    startNight((currentNight % 3) + 1);
  },
  onBeginNight: () => {
    audio.ensureContext();
    startNight(currentNight);
  },
  onResume: () => togglePause(),
  onPause: () => togglePause(),
  onReplayNight: () => {
    audio.ensureContext();
    startNight(currentNight);
  },
  onNextNight: () => {
    audio.ensureContext();
    const next = Math.min(3, currentNight + 1);
    currentNight = next;
    uiPhase = 'intro';
    hud.showIntro(next, getMapConfig(next));
  },
  onToMenu: () => {
    isAutoDemo = false;
    hud.setDemoActive(false);
    uiPhase = 'menu';
    hud.setScreen('menu');
  },
  onOpenLeaderboard: async () => {
    const entries = await fetchLeaderboard();
    hud.showLeaderboard(entries);
  },
  onSaveLeaderboard: async (name) => {
    await submitLeaderboardScore({
      name,
      score: getTotalScore(),
      nights_won: nightsWonCount,
      seed: currentSeed
    });
  },
  onOpenSettings: () => {
    settingsReturnPhase = uiPhase;
    hud.showSettings(settings);
  },
  onCloseSettings: () => {
    hud.hideSettings();
    uiPhase = settingsReturnPhase;
  },
  onChangeVolume: (v) => {
    settings.volume = v;
    audio.setVolume(v);
    saveSettings(settings);
  },
  onChangeSensitivity: (s) => {
    settings.sensitivity = s;
    input.setSensitivity(s);
    saveSettings(settings);
  },
  onChangeKeyBindings: (nextBindings) => {
    settings.keyBindings = nextBindings;
    input.setKeyBindings(nextBindings);
    saveSettings(settings);
  },
  onToggleAccessiblePalette: (enabled) => applyAccessiblePalette(enabled),
  onToggleReduceMotion: (enabled) => applyReduceMotion(enabled),
  onToggleLargeText: (enabled) => applyLargeText(enabled),
  onToggleLightMode: () => applyLightMode(!settings.lightMode)
});

if (isBenchMode) {
  hudRoot.style.display = 'none';
  renderApp.setLightMode(false);
  worldView.setLightMode(false);
} else {
  applyLightMode(settings.lightMode);
  applyAccessiblePalette(settings.accessiblePalette);
  applyReduceMotion(settings.reduceMotion);
  applyLargeText(settings.largeText);
  hud.setScreen('menu');
}

let accumulator = 0;
let elapsedSec = 0;
const frameTimesMs = [];
const benchDtsMs = [];
let benchFirstFrameDone = false;
let benchLoadMs = 0;
let benchReported = false;

function updateCamera() {
  if (isBenchMode) {
    // Radius 30m, Y = 15m, starting at (30, 15, 0), CCW from above, 15s per revolution
    const angle = (2 * Math.PI * elapsedSec) / 15;
    renderApp.camera.position.set(
      30 * Math.cos(angle),
      15,
      -30 * Math.sin(angle)
    );
    renderApp.camera.lookAt(0, 0, 0);
    return;
  }

  const theta = (input.getCamYawDeg() * Math.PI) / 180;
  const forwardX = Math.sin(theta);
  const forwardZ = Math.cos(theta);
  const distance = 8.5;
  const height = 4.6;

  const px = sim.player.pos[0];
  const py = sim.player.pos[1];
  const pz = sim.player.pos[2];

  renderApp.camera.position.set(
    px - forwardX * distance,
    py + height,
    pz - forwardZ * distance
  );
  renderApp.camera.lookAt(px, py + 1.35, pz + forwardZ * 1.5);
}

let lastTime = performance.now();

function frame(now) {
  const frameDtMs = now - lastTime;
  const rawDt = Math.min(0.1, frameDtMs / 1000);
  lastTime = now;

  if (!benchFirstFrameDone) {
    benchFirstFrameDone = true;
    benchLoadMs = Math.round(now);
  }

  if (frameDtMs > 0 && frameDtMs < 500) {
    frameTimesMs.push(frameDtMs);
    if (frameTimesMs.length > 4000) frameTimesMs.shift();
  }

  elapsedSec += rawDt;

  if (isBenchMode) {
    accumulator += rawDt;
    while (accumulator >= SIM_DT) {
      stepSimulation(sim, null);
      accumulator -= SIM_DT;
    }
    if (elapsedSec >= 3.0 && elapsedSec < 3.0 + benchDurationS) {
      if (frameDtMs > 0) benchDtsMs.push(frameDtMs);
    } else if (elapsedSec >= 3.0 + benchDurationS && !benchReported) {
      benchReported = true;
      const metrics = computeBenchMetrics(benchDtsMs);
      const gl = renderApp.renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const gpuName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'WebGL2';
      fetch('/api/bench-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metrics,
          load_ms: benchLoadMs,
          renderer: `Three.js r174 WebGL2 (${gpuName})`
        })
      }).catch(() => {});
      return;
    }
  } else if (uiPhase === 'playing' && sim.state === 'playing') {
    accumulator += rawDt;
    input.updateCameraYaw(rawDt);
    while (accumulator >= SIM_DT && sim.state === 'playing') {
      const prevGrounded = sim.player.grounded;
      let tickInput;
      if (isAutoDemo) {
        const botOut = demoBot.step(sim, SIM_DT);
        tickInput = botOut.frame;
        input.setCamYawDeg(botOut.camYawDeg);
      } else {
        tickInput = input.consumeTickInput();
      }
      const events = stepSimulation(sim, tickInput);
      if (prevGrounded && !sim.player.grounded && sim.player.vel[1] > 0) {
        audio.playCue('jump');
      }
      for (const ev of events) {
        if (ev.name === 'pulse') {
          worldView.triggerPulseEffect(sim.player.pos, sim.tuning.pulse_radius);
          audio.playCue('pulse');
        } else if (ev.name === 'player_hit') {
          hud.triggerHitFlash();
          audio.playCue('player_hit');
        } else if (ev.name === 'shade_spawned') {
          const spawned = sim.shades.find((s) => s.id === ev.data.id);
          hud.triggerShadeSpawnedAlert(spawned?.pos);
          audio.playCue('shade_spawned');
        } else if (
          ev.name === 'mote_picked' ||
          ev.name === 'deposit' ||
          ev.name === 'refuel' ||
          ev.name === 'lantern_lit' ||
          ev.name === 'lantern_out' ||
          ev.name === 'dash' ||
          ev.name === 'charm_picked' ||
          ev.name === 'drifter_steal' ||
          ev.name === 'drifter_drop'
        ) {
          audio.playCue(ev.name);
        }
      }

      if (sim.wind.warning && !prevWindWarning) {
        audio.playCue('wind_warning');
      }
      prevWindWarning = sim.wind.warning;

      const secLeft = Math.ceil(sim.timeLeftS);
      if (secLeft <= 10 && secLeft >= 1 && secLeft !== lastCountdownSec) {
        lastCountdownSec = secLeft;
        audio.playCue('countdown');
      }

      if (sim.state === 'won' || sim.state === 'lost') {
        if (sim.state === 'won') {
          nightScores[sim.night] = sim.score;
          nightsWonCount = Math.max(nightsWonCount, sim.night);
          audio.playCue('won');
        } else {
          audio.playCue('lost');
        }
        uiPhase = 'result';
        hud.showResult(sim, getTotalScore());
        if (isAutoDemo) {
          const finishedNight = sim.night;
          const wasWon = sim.state === 'won';
          setTimeout(() => {
            if (!isAutoDemo) return;
            if (wasWon && finishedNight < 3) {
              demoBot.reset();
              startNight(finishedNight + 1);
            } else if (!wasWon) {
              demoBot.reset();
              startNight(finishedNight);
            } else {
              isAutoDemo = false;
              hud.setDemoActive(false);
            }
          }, 2200);
        }
      }

      accumulator -= SIM_DT;
    }
  } else {
    accumulator = 0;
  }

  worldView.sync(sim, elapsedSec, rawDt);
  updateCamera();
  if (!isBenchMode) {
    hud.update(sim, getTotalScore(), renderApp.camera, rawDt);
  }
  renderApp.renderer.render(renderApp.scene, renderApp.camera);

  requestAnimationFrame(frame);
}

window.__GAME_DEBUG__ = {
  isWebGL2: renderApp.isWebGL2,
  getSnapshot: () => serializeSnapshot(sim),
  getTotalScore,
  startNight: (n) => startNight(n),
  setLightMode: (enabled) => applyLightMode(Boolean(enabled)),
  setAccessiblePalette: (enabled) => applyAccessiblePalette(Boolean(enabled)),
  getRenderStats: () => ({
    calls: renderApp.renderer.info.render.calls,
    triangles: renderApp.renderer.info.render.triangles,
    points: renderApp.renderer.info.render.points,
    geometries: renderApp.renderer.info.memory.geometries,
    textures: renderApp.renderer.info.memory.textures
  }),
  resetPerfStats: () => {
    frameTimesMs.length = 0;
  },
  getPerfStats: () => {
    if (frameTimesMs.length === 0) return { samples: 0, avgFps: 0, p95Ms: 0, durationSec: 0 };
    const sorted = [...frameTimesMs].sort((a, b) => a - b);
    const totalMs = frameTimesMs.reduce((a, b) => a + b, 0);
    const avgMs = totalMs / frameTimesMs.length;
    const p95Ms = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    return {
      samples: frameTimesMs.length,
      durationSec: Number((totalMs / 1000).toFixed(1)),
      avgFps: Number((1000 / avgMs).toFixed(1)),
      p95Ms: Number(p95Ms.toFixed(2))
    };
  }
};

worldView.sync(sim, 0, SIM_DT);
updateCamera();
if (!isBenchMode) {
  hud.update(sim, getTotalScore(), renderApp.camera, 0);
}
requestAnimationFrame(frame);
