import './style.css';
import contract from '../../game.contract.json';
import {
  SIM_DT,
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

const canvas = document.getElementById('game-canvas');
const hudRoot = document.getElementById('hud-root');

const settings = loadSettings();
const urlLight = new URLSearchParams(window.location.search).get('light') === '1';
if (urlLight) settings.lightMode = true;

const renderApp = createRenderApp(canvas);
const audio = createAudioController(settings.volume);
const input = createWebInputController({
  initialYawDeg: 0,
  sensitivity: settings.sensitivity
});
input.attachWindowListeners(window, canvas);

let currentNight = 1;
let nightScores = { 1: 0, 2: 0, 3: 0 };
let uiPhase = 'menu'; // 'menu' | 'intro' | 'playing' | 'paused' | 'result'
let settingsReturnPhase = 'menu';
let lastCountdownSec = -1;
let prevWindWarning = false;

function getTotalScore() {
  return nightScores[1] + nightScores[2] + nightScores[3];
}

let sim = createSimulationState({
  night: currentNight,
  seed: 42,
  tuning: contract.tuning
});
const worldView = createWorldView(renderApp.scene, sim, renderApp.camera);

function startNight(nightNum) {
  currentNight = nightNum;
  nightScores[currentNight] = 0;
  sim = createSimulationState({
    night: currentNight,
    seed: 42 + (currentNight - 1) * 101,
    tuning: contract.tuning
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

const hud = createHud(hudRoot, {
  onStartGame: () => {
    audio.ensureContext();
    nightScores = { 1: 0, 2: 0, 3: 0 };
    currentNight = 1;
    uiPhase = 'intro';
    hud.showIntro(1, getMapConfig(1));
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
    uiPhase = 'menu';
    hud.setScreen('menu');
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
  onToggleAccessiblePalette: (enabled) => applyAccessiblePalette(enabled),
  onToggleLightMode: () => applyLightMode(!settings.lightMode)
});

applyLightMode(settings.lightMode);
applyAccessiblePalette(settings.accessiblePalette);
hud.setScreen('menu');

let accumulator = 0;
let elapsedSec = 0;
const frameTimesMs = [];

function updateCamera() {
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

  if (frameDtMs > 0 && frameDtMs < 500) {
    frameTimesMs.push(frameDtMs);
    if (frameTimesMs.length > 4000) frameTimesMs.shift();
  }

  elapsedSec += rawDt;

  if (uiPhase === 'playing' && sim.state === 'playing') {
    accumulator += rawDt;
    input.updateCameraYaw(rawDt);
    while (accumulator >= SIM_DT && sim.state === 'playing') {
      const prevGrounded = sim.player.grounded;
      const events = stepSimulation(sim, input.consumeTickInput());
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
        } else if (
          ev.name === 'mote_picked' ||
          ev.name === 'deposit' ||
          ev.name === 'refuel' ||
          ev.name === 'lantern_out' ||
          ev.name === 'lantern_lit' ||
          ev.name === 'dash' ||
          ev.name === 'shade_spawned' ||
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
          audio.playCue('won');
        } else {
          audio.playCue('lost');
        }
        uiPhase = 'result';
        hud.showResult(sim, getTotalScore());
      }

      accumulator -= SIM_DT;
    }
  } else {
    accumulator = 0;
  }

  worldView.sync(sim, elapsedSec, rawDt);
  updateCamera();
  hud.update(sim, getTotalScore(), renderApp.camera, rawDt);
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
hud.update(sim, getTotalScore(), renderApp.camera, 0);
requestAnimationFrame(frame);
