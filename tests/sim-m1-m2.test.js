import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ISLAND_RADIUS,
  createSimulationState,
  distXZ,
  serializeSnapshot,
  stepSimulation
} from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
);
const tuning = contract.tuning;

test('movement straight, normalized diagonal, 90deg camera yaw, and island clamp', () => {
  const sim = createSimulationState({
    seed: 1,
    tuning,
    scenario: { random_motes: false, random_shades: false }
  });

  // Straight +Z for 60 ticks (1s) at cam_yaw_deg = 0
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(sim, { move: [0, 1], cam_yaw_deg: 0 });
  }
  assert.ok(Math.abs(sim.player.pos[0]) < 1e-6);
  assert.ok(Math.abs(sim.player.pos[2] - tuning.player_speed) < 1e-4);

  // Diagonal [1, 1] for 60 ticks should be normalized to player_speed
  const simDiag = createSimulationState({
    seed: 1,
    tuning,
    scenario: { random_motes: false, random_shades: false }
  });
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(simDiag, { move: [1, 1], cam_yaw_deg: 0 });
  }
  const distDiag = distXZ([0, 0, 0], simDiag.player.pos);
  assert.ok(Math.abs(distDiag - tuning.player_speed) < 1e-4);

  // Camera yaw 90 deg with move [0, 1] -> moves along +X
  const simYaw = createSimulationState({
    seed: 1,
    tuning,
    scenario: { random_motes: false, random_shades: false }
  });
  for (let i = 0; i < 60; i += 1) {
    stepSimulation(simYaw, { move: [0, 1], cam_yaw_deg: 90 });
  }
  assert.ok(Math.abs(simYaw.player.pos[0] - tuning.player_speed) < 1e-4);
  assert.ok(Math.abs(simYaw.player.pos[2]) < 1e-4);

  // Island boundary clamp
  const simEdge = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, ISLAND_RADIUS - 0.1] },
      random_motes: false,
      random_shades: false
    }
  });
  for (let i = 0; i < 30; i += 1) {
    stepSimulation(simEdge, { move: [0, 1], cam_yaw_deg: 0 });
  }
  assert.ok(distXZ([0, 0, 0], simEdge.player.pos) <= ISLAND_RADIUS + 1e-6);
});

test('jump rising edge and landing at y = 0', () => {
  const sim = createSimulationState({
    seed: 1,
    tuning,
    scenario: { random_motes: false, random_shades: false }
  });

  stepSimulation(sim, { jump: true });
  assert.ok(sim.player.pos[1] > 0);
  let maxY = sim.player.pos[1];
  // Hold jump: should not double jump
  for (let i = 0; i < 90; i += 1) {
    stepSimulation(sim, { jump: true });
    if (sim.player.pos[1] > maxY) maxY = sim.player.pos[1];
  }
  assert.ok(maxY > 1.0);
  assert.equal(sim.player.pos[1], 0);
  assert.equal(sim.player.grounded, true);
});

test('mote pickup boundary and carry_capacity limit', () => {
  const motes = [
    [0, 0, tuning.pickup_radius], // exactly on boundary -> picked
    [0, 0, tuning.pickup_radius + 0.05] // just outside -> not picked
  ];
  const sim = createSimulationState({
    seed: 1,
    tuning,
    scenario: { motes, random_shades: false }
  });

  const events = stepSimulation(sim, { move: [0, 0] });
  assert.equal(sim.player.carried, 1);
  assert.equal(sim.score, tuning.score.per_mote);
  assert.equal(events.length, 1);
  assert.equal(events[0].tick, 1);
  assert.equal(events[0].name, 'mote_picked');
  assert.equal(events[0].data.carried, 1);

  // Carry capacity cap (8)
  const manyMotes = Array.from({ length: 10 }, () => [0, 0, 0]);
  const simFull = createSimulationState({
    seed: 1,
    tuning,
    scenario: { motes: manyMotes, random_shades: false }
  });
  stepSimulation(simFull, {});
  assert.equal(simFull.player.carried, tuning.carry_capacity);
  assert.equal(simFull.motes.filter((m) => m.active).length, 2);
});

test('partial deposit, lighting L1, holding E only triggers once, and ID tie-break', () => {
  const sim = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 13.5], carried: 2 },
      lanterns: [{ id: 'L1', pos: [0, 0, 14], deposited: 0 }],
      random_motes: false,
      random_shades: false
    }
  });

  // First press E: deposits 2
  const e1 = stepSimulation(sim, { interact: true });
  assert.equal(sim.player.carried, 0);
  assert.equal(sim.lanterns[0].deposited, 2);
  assert.equal(sim.lanterns[0].lit, false);
  assert.equal(e1[0].name, 'deposit');
  assert.deepEqual(e1[0].data, { lantern_id: 'L1', amount: 2, deposited: 2 });

  // Give 4 more motes via scenario-like state or pickup
  sim.player.carried = 4;
  // Still holding E=true -> should NOT deposit!
  const eHeld = stepSimulation(sim, { interact: true });
  assert.equal(eHeld.length, 0);
  assert.equal(sim.player.carried, 4);

  // Release E then press E again -> deposits 3 (needed = 5 - 2 = 3), lights L1
  stepSimulation(sim, { interact: false });
  const e2 = stepSimulation(sim, { interact: true });
  assert.equal(sim.player.carried, 1);
  assert.equal(sim.lanterns[0].deposited, 5);
  assert.equal(sim.lanterns[0].lit, true);
  assert.equal(sim.score, tuning.score.per_lantern);
  assert.equal(e2.length, 2);
  assert.equal(e2[0].name, 'deposit');
  assert.deepEqual(e2[0].data, { lantern_id: 'L1', amount: 3, deposited: 5 });
  assert.equal(e2[1].name, 'lantern_lit');
  assert.deepEqual(e2[1].data, { lantern_id: 'L1' });

  // Tie-break by ID when equidistant
  const simTie = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 1 },
      lanterns: [
        { id: 'L2', pos: [1, 0, 0], deposited: 0 },
        { id: 'L1', pos: [-1, 0, 0], deposited: 0 }
      ],
      random_motes: false,
      random_shades: false
    }
  });
  const eTie = stepSimulation(simTie, { interact: true });
  assert.equal(eTie[0].data.lantern_id, 'L1');
});

test('CLI handles --ticks 0 and exits with code 2 on malformed inputs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-den-long-'));
  const out0 = path.join(tmpDir, 't0.jsonl');
  execFileSync(
    'node',
    ['scripts/headless.js', '--seed', '42', '--night', '1', '--ticks', '0', '--out', out0],
    { cwd: ROOT }
  );
  const lines0 = fs.readFileSync(out0, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines0.length, 2);
  assert.equal(lines0[0].type, 'snapshot');
  assert.equal(lines0[0].tick, 0);
  assert.equal(lines0[1].type, 'end');
  assert.equal(lines0[1].ticks, 0);

  // Duplicate tick in inputs -> exit 2
  const badInputs = path.join(tmpDir, 'bad-inputs.json');
  fs.writeFileSync(
    badInputs,
    JSON.stringify({ frames: [{ tick: 1, move: [0, 1] }, { tick: 1, move: [0, 0] }] })
  );
  const res = spawnSync(
    'node',
    [
      'scripts/headless.js',
      '--seed',
      '42',
      '--night',
      '1',
      '--ticks',
      '10',
      '--inputs',
      badInputs,
      '--out',
      path.join(tmpDir, 'never.jsonl')
    ],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.equal(res.status, 2);
  assert.ok(res.stderr.length > 0);
});
