import './style.css';
import contract from '../../game.contract.json';
import {
  SIM_DT,
  createSimulationState,
  serializeSnapshot,
  stepSimulation
} from '../sim/index.js';
import { createRenderApp } from './render/app.js';
import { createWorldView } from './render/world.js';
import { createHud } from './ui/hud.js';
import { createWebInputController } from './input.js';

const canvas = document.getElementById('game-canvas');
const hudRoot = document.getElementById('hud-root');

const renderApp = createRenderApp(canvas);
let sim = createSimulationState({
  seed: 42,
  tuning: contract.tuning
});
const worldView = createWorldView(renderApp.scene, sim);
const input = createWebInputController({ initialYawDeg: 0 });
input.attachWindowListeners(window, canvas);

let lightMode = new URLSearchParams(window.location.search).get('light') === '1';

function applyLightMode(enabled) {
  lightMode = enabled;
  renderApp.setLightMode(enabled);
  worldView.setLightMode(enabled);
  hud.setLightModeLabel(enabled);
}

let accumulator = 0;
let elapsedSec = 0;
const frameTimesMs = [];

function resetGame() {
  sim = createSimulationState({
    seed: 42,
    tuning: contract.tuning
  });
  worldView.reset();
  accumulator = 0;
  elapsedSec = 0;
  worldView.sync(sim, 0, SIM_DT);
  updateCamera();
  hud.update(sim, 0);
}

const hud = createHud(hudRoot, {
  onToggleLightMode: () => applyLightMode(!lightMode),
  onReplay: resetGame
});
applyLightMode(lightMode);

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
    if (frameTimesMs.length > 600) frameTimesMs.shift();
  }

  accumulator += rawDt;
  elapsedSec += rawDt;

  if (sim.state === 'playing') {
    input.updateCameraYaw(rawDt);
    while (accumulator >= SIM_DT) {
      const events = stepSimulation(sim, input.consumeTickInput());
      for (const ev of events) {
        if (ev.name === 'pulse') {
          worldView.triggerPulseEffect(sim.player.pos, sim.tuning.pulse_radius);
        } else if (ev.name === 'player_hit') {
          hud.triggerHitFlash();
        }
      }
      accumulator -= SIM_DT;
    }
  } else {
    accumulator = 0;
  }

  worldView.sync(sim, elapsedSec, rawDt);
  updateCamera();
  hud.update(sim, rawDt);
  renderApp.renderer.render(renderApp.scene, renderApp.camera);

  requestAnimationFrame(frame);
}

window.__GAME_DEBUG__ = {
  isWebGL2: renderApp.isWebGL2,
  getSnapshot: () => serializeSnapshot(sim),
  setLightMode: (enabled) => applyLightMode(Boolean(enabled)),
  resetGame,
  getPerfStats: () => {
    if (frameTimesMs.length === 0) return { samples: 0, avgFps: 0, p95Ms: 0 };
    const sorted = [...frameTimesMs].sort((a, b) => a - b);
    const avgMs = frameTimesMs.reduce((a, b) => a + b, 0) / frameTimesMs.length;
    const p95Ms = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    return {
      samples: frameTimesMs.length,
      avgFps: Number((1000 / avgMs).toFixed(1)),
      p95Ms: Number(p95Ms.toFixed(2))
    };
  }
};

worldView.sync(sim, 0, SIM_DT);
updateCamera();
hud.update(sim, 0);
requestAnimationFrame(frame);
