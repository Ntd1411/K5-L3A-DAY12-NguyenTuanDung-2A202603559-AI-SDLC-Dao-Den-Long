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
const sim = createSimulationState({
  seed: 42,
  tuning: contract.tuning
});
const worldView = createWorldView(renderApp.scene, sim);
const hud = createHud(hudRoot);
const input = createWebInputController({ initialYawDeg: 0 });
input.attachWindowListeners(window, canvas);

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
let accumulator = 0;
let elapsedSec = 0;

function frame(now) {
  const rawDt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += rawDt;
  elapsedSec += rawDt;

  input.updateCameraYaw(rawDt);
  while (accumulator >= SIM_DT) {
    stepSimulation(sim, input.consumeTickInput());
    accumulator -= SIM_DT;
  }

  worldView.sync(sim, elapsedSec);
  updateCamera();
  hud.update(sim);
  renderApp.renderer.render(renderApp.scene, renderApp.camera);

  requestAnimationFrame(frame);
}

window.__GAME_DEBUG__ = {
  isWebGL2: renderApp.isWebGL2,
  getSnapshot: () => serializeSnapshot(sim)
};

worldView.sync(sim, 0);
updateCamera();
hud.update(sim);
requestAnimationFrame(frame);
