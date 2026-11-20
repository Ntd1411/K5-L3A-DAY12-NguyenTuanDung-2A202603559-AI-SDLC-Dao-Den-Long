import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createSimulationState,
  stepSimulation
} from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
);

test('movement straight, normalized diagonal, 90deg camera yaw, and island fall at R40', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: { random_motes: false, random_shades: false }
  });

  // Accelerate to full 6.0 m/s over 6 ticks, then run 54 more ticks = ~5.7m
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(sim, { move: [0, 1], cam_yaw_deg: 0 });
  }
  assert.ok(sim.player.pos[2] > 5.4 && sim.player.pos[2] <= 6.01, `z=${sim.player.pos[2]}`);
  assert.equal(sim.player.pos[0], 0);

  // Diagonal movement is normalized
  const simDiag = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: { random_motes: false, random_shades: false }
  });
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(simDiag, { move: [1, 1], cam_yaw_deg: 0 });
  }
  const distDiag = Math.hypot(simDiag.player.pos[0], simDiag.player.pos[2]);
  assert.ok(distDiag > 5.4 && distDiag <= 6.01, `distDiag=${distDiag}`);

  // 90deg camera yaw: forward input [0, 1] moves along +X
  const simYaw = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: { random_motes: false, random_shades: false }
  });
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(simYaw, { move: [0, 1], cam_yaw_deg: 90 });
  }
  assert.ok(simYaw.player.pos[0] > 5.4, `x=${simYaw.player.pos[0]}`);
  assert.ok(Math.abs(simYaw.player.pos[2]) < 1e-4);

  // Walking past R=40 on Night 1 causes fall off island
  const simEdge = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 39.5], carried: 4, flames: 3 },
      random_motes: false,
      random_shades: false
    }
  });
  let hitEvent = null;
  for (let i = 0; i < 120; i += 1) {
    const evs = stepSimulation(simEdge, { move: [0, 1], cam_yaw_deg: 0 });
    const h = evs.find((e) => e.name === 'player_hit');
    if (h) {
      hitEvent = h;
      break;
    }
  }
  assert.ok(hitEvent, 'expected fall player_hit past R40');
  assert.equal(hitEvent.data.by, 'fall');
  assert.equal(hitEvent.data.lost, 4);
  assert.equal(simEdge.player.flames, 2);
});

test('jump rising edge (7 m/s, -20 m/s^2) and landing at y = 0', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: { random_motes: false, random_shades: false }
  });

  stepSimulation(sim, { jump: true });
  assert.equal(sim.player.grounded, false);
  assert.ok(sim.player.pos[1] > 0);

  let maxY = sim.player.pos[1];
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(sim, { jump: true });
    maxY = Math.max(maxY, sim.player.pos[1]);
  }
  // Peak of 7 m/s with -20 m/s^2 is ~1.225 m
  assert.ok(maxY > 1.1 && maxY < 1.3, `maxY=${maxY}`);
  assert.equal(sim.player.grounded, true);
  assert.equal(sim.player.pos[1], 0);
});

test('mote pickup boundary (1.0m XZ, 1.5m Y) and carry_capacity limit (10)', () => {
  const motes = [];
  for (let i = 0; i < 12; i += 1) {
    motes.push([0, 0, 0.5]);
  }
  motes.push([0, 0, 1.5]); // > 1.0m away
  motes.push([0, 2.0, 0]); // > 1.5m height diff

  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      motes,
      random_shades: false
    }
  });

  const events = stepSimulation(sim, { move: [0, 0] });
  const pickedEvents = events.filter((e) => e.name === 'mote_picked');
  assert.equal(pickedEvents.length, 10);
  assert.equal(sim.player.carried, 10);
  assert.equal(sim.score, 0, 'v1.2 grants score on deposit/refuel, not pickup');
  assert.equal(sim.motes.filter((m) => m.active).length, 4);
});

test('partial deposit, lighting L1 (10 motes), holding E triggers once, and ID tie-break', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 24.0], carried: 6 },
      random_motes: false,
      random_shades: false
    }
  });

  // First interact deposits 6
  const ev1 = stepSimulation(sim, { interact: true });
  assert.ok(ev1.some((e) => e.name === 'deposit' && e.data.lantern_id === 'L1' && e.data.amount === 6));
  assert.equal(sim.player.carried, 0);
  assert.equal(sim.score, 30);

  // Holding E does not re-trigger
  sim.player.carried = 4;
  const evHold = stepSimulation(sim, { interact: true });
  assert.equal(evHold.filter((e) => e.name === 'deposit').length, 0);

  // Release E, then press E again to finish lighting L1
  stepSimulation(sim, { interact: false });
  const ev2 = stepSimulation(sim, { interact: true });
  assert.ok(ev2.some((e) => e.name === 'deposit' && e.data.amount === 4 && e.data.deposited === 10));
  assert.ok(ev2.some((e) => e.name === 'lantern_lit' && e.data.lantern_id === 'L1'));
  assert.equal(sim.lanterns[0].lit, true);
  // Ticket-03 replaces +10/mote with +5/mote and keeps +100 for first light.
  assert.equal(sim.score, 30 + 20 + 100);

  // Tie-break: L2 and L3 equidistant from player -> L2 wins
  const simTie = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 3 },
      lanterns: [
        { id: 'L2', pos: [1.5, 0, 0] },
        { id: 'L3', pos: [-1.5, 0, 0] }
      ],
      random_motes: false,
      random_shades: false
    }
  });
  const evTie = stepSimulation(simTie, { interact: true });
  assert.ok(evTie.some((e) => e.name === 'deposit' && e.data.lantern_id === 'L2'));
});

test('CLI handles --ticks 0 and exits with code 2 on malformed inputs', () => {
  const outPath = path.join('/tmp', 'test-ticks0-v11.jsonl');
  execFileSync(
    'node',
    ['scripts/headless.js', '--night', '1', '--seed', '42', '--ticks', '0', '--out', outPath],
    { cwd: ROOT }
  );
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(lines[0].type, 'snapshot');
  assert.equal(lines[0].night, 1);
  assert.equal(lines[1].name, 'night_start');
  assert.equal(lines[2].type, 'end');
  assert.equal(lines[2].ticks, 0);

  const badInputsPath = path.join('/tmp', 'bad-inputs-v11.json');
  fs.writeFileSync(badInputsPath, '{"frames": [{"tick": 5}, {"tick": 5}]}', 'utf8');
  let exitCode = 0;
  try {
    execFileSync(
      'node',
      ['scripts/headless.js', '--ticks', '10', '--inputs', badInputsPath, '--out', outPath],
      { cwd: ROOT, stdio: 'pipe' }
    );
  } catch (err) {
    exitCode = err.status;
  }
  assert.equal(exitCode, 2);
});
