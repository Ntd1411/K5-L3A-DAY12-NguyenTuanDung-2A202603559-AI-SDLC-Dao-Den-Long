import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSimulationState, stepSimulation } from '../src/sim/index.js';
import { createWebInputController } from '../src/web/input.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
);
const tuning = contract.tuning;

test('quick tap and release between ticks is latched for E, Space, and Q', () => {
  const sim = createSimulationState({
    seed: 42,
    tuning,
    scenario: {
      player: { pos: [0, 0, 13.5], carried: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 14], deposited: 0 }],
      random_motes: false,
      random_shades: false
    }
  });
  const input = createWebInputController();

  // Press and release E, Space, and Q before any simulation tick runs
  input.onKeyDown('KeyE', false);
  input.onKeyUp('KeyE');
  input.onKeyDown('Space', false);
  input.onKeyUp('Space');
  input.onKeyDown('KeyQ', false);
  input.onKeyUp('KeyQ');

  // Tick 1 consumes the latched actions
  const tick1Frame = input.consumeTickInput();
  assert.equal(tick1Frame.interact, true);
  assert.equal(tick1Frame.jump, true);
  assert.equal(tick1Frame.pulse, true);

  stepSimulation(sim, tick1Frame);
  assert.equal(sim.lanterns[0].deposited, 3);
  assert.equal(sim.player.carried, 0);
  assert.ok(sim.player.pos[1] > 0);

  // Subsequent 5 ticks (total 6 ticks) should have false for all three
  for (let i = 0; i < 5; i += 1) {
    const nextFrame = input.consumeTickInput();
    assert.equal(nextFrame.interact, false);
    assert.equal(nextFrame.jump, false);
    assert.equal(nextFrame.pulse, false);
    stepSimulation(sim, nextFrame);
  }
  assert.equal(sim.lanterns[0].deposited, 3);
});

test('holding E across multiple ticks only triggers one deposit', () => {
  const sim = createSimulationState({
    seed: 42,
    tuning,
    scenario: {
      player: { pos: [0, 0, 13.5], carried: 2 },
      lanterns: [{ id: 'L1', pos: [0, 0, 14], deposited: 0 }],
      random_motes: false,
      random_shades: false
    }
  });
  const input = createWebInputController();

  input.onKeyDown('KeyE', false);
  stepSimulation(sim, input.consumeTickInput());
  assert.equal(sim.lanterns[0].deposited, 2);

  sim.player.carried = 2;
  // Still held (including OS repeat) -> should not deposit again
  input.onKeyDown('KeyE', true);
  stepSimulation(sim, input.consumeTickInput());
  assert.equal(sim.lanterns[0].deposited, 2);
  assert.equal(sim.player.carried, 2);
});
