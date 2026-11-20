import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createSimulationState,
  distXZ,
  stepSimulation
} from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
);
const tuning = contract.tuning;

test('pulse stuns and pushes shades, respects cost and cooldown', () => {
  const sim = createSimulationState({
    seed: 10,
    tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 1 },
      shades: [{ id: 'S1', pos: [0, 0, 3] }],
      random_motes: false,
      random_shades: false
    }
  });

  // Insufficient light (carried 1 < pulse_cost 2)
  const eFail = stepSimulation(sim, { pulse: true });
  assert.equal(eFail.some((e) => e.name === 'pulse'), false);
  assert.equal(sim.player.carried, 1);

  stepSimulation(sim, { pulse: false });
  sim.player.carried = 4;
  const distBeforePulse = distXZ(sim.player.pos, sim.shades[0].pos);

  const ePulse = stepSimulation(sim, { pulse: true });
  const pulseEvent = ePulse.find((e) => e.name === 'pulse');
  assert.ok(pulseEvent);
  assert.deepEqual(pulseEvent.data.stunned_ids, ['S1']);
  assert.equal(sim.player.carried, 2);
  assert.equal(sim.score, tuning.score.per_stun);
  assert.equal(sim.shades[0].state, 'stunned');
  assert.ok(
    distXZ(sim.player.pos, sim.shades[0].pos) >=
      distBeforePulse + tuning.pulse_push_m - 1e-4
  );

  // Cooldown blocks immediate second pulse
  stepSimulation(sim, { pulse: false });
  const eCd = stepSimulation(sim, { pulse: true });
  assert.equal(eCd.some((e) => e.name === 'pulse'), false);

  // After stun duration, shade returns to chase
  const stunTicks = Math.ceil(tuning.pulse_stun_s * 60) + 2;
  for (let i = 0; i < stunTicks; i += 1) {
    stepSimulation(sim, { pulse: false });
  }
  assert.equal(sim.shades[0].state, 'chase');
});

test('player_hit reduces flames and grants invulnerability window', () => {
  const sim = createSimulationState({
    seed: 10,
    tuning,
    scenario: {
      player: { pos: [0, 0, 0], flames: 3, carried: 5 },
      shades: [{ id: 'S1', pos: [0, 0, 0.5] }],
      random_motes: false,
      random_shades: false
    }
  });

  const e1 = stepSimulation(sim, {});
  const hit1 = e1.find((e) => e.name === 'player_hit');
  assert.ok(hit1);
  assert.deepEqual(hit1.data, { by: 'shade', flames: 2, dropped: 0 });
  assert.equal(sim.player.carried, 5);

  // Next 30 ticks within invuln_s (1.5s = 90 ticks) must not hit again
  for (let i = 0; i < 30; i += 1) {
    const ev = stepSimulation(sim, {});
    assert.equal(ev.some((e) => e.name === 'player_hit'), false);
  }
  assert.equal(sim.player.flames, 2);
});

test('shades respect safe_radius around lit lanterns', () => {
  const sim = createSimulationState({
    seed: 10,
    tuning,
    scenario: {
      player: { pos: [0, 0, 14] },
      lanterns: [{ id: 'L1', pos: [0, 0, 14], lit: true }],
      shades: [{ id: 'S1', pos: [0, 0, 14 + tuning.safe_radius + 0.5] }],
      random_motes: false,
      random_shades: false
    }
  });

  for (let i = 0; i < 60; i += 1) {
    stepSimulation(sim, {});
    assert.ok(
      distXZ(sim.shades[0].pos, sim.lanterns[0].pos) >= tuning.safe_radius - 1e-6
    );
  }
});

test('endings: all_lit, no_flames, dawn, and simultaneous priority', () => {
  // 1. all_lit with remaining time & flames bonus
  const simWin = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 14], carried: 1, flames: 2 },
      lanterns: [
        { id: 'L1', deposited: 4, lit: false },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', lit: true }
      ],
      time_left_s: 100,
      random_motes: false,
      random_shades: false
    }
  });
  const eWin = stepSimulation(simWin, { interact: true });
  const overWin = eWin.find((e) => e.name === 'game_over');
  assert.deepEqual(overWin.data, { result: 'won', reason: 'all_lit' });
  assert.equal(simWin.state, 'won');
  const expectedBonus =
    Math.floor(simWin.timeLeftS) * tuning.score.per_second_left +
    2 * tuning.score.per_flame_left;
  assert.equal(simWin.score, tuning.score.per_lantern + expectedBonus);
  // Stepping after game_over does nothing
  assert.deepEqual(stepSimulation(simWin, {}), []);

  // 2. no_flames
  const simNoFlames = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 0], flames: 1 },
      shades: [{ id: 'S1', pos: [0, 0, 0.2] }],
      random_motes: false,
      random_shades: false
    }
  });
  const eLoss = stepSimulation(simNoFlames, {});
  const overLoss = eLoss.find((e) => e.name === 'game_over');
  assert.deepEqual(overLoss.data, { result: 'lost', reason: 'no_flames' });

  // 3. dawn
  const simDawn = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      time_left_s: 1 / 60,
      random_motes: false,
      random_shades: false
    }
  });
  const eDawn = stepSimulation(simDawn, {});
  assert.deepEqual(eDawn.find((e) => e.name === 'game_over').data, {
    result: 'lost',
    reason: 'dawn'
  });

  // 4. Simultaneous priority: all_lit beats no_flames and dawn
  const simPriority = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 14], carried: 1, flames: 1 },
      lanterns: [
        { id: 'L1', deposited: 4, lit: false },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', lit: true }
      ],
      shades: [{ id: 'S1', pos: [0, 0, 14.1] }],
      time_left_s: 1 / 60,
      random_motes: false,
      random_shades: false
    }
  });
  const ePrio = stepSimulation(simPriority, { interact: true });
  assert.deepEqual(ePrio.find((e) => e.name === 'game_over').data, {
    result: 'won',
    reason: 'all_lit'
  });
});

test('CLI exits with code 2 on malformed scenario JSON', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-den-long-m3-'));
  const badScenario = path.join(tmpDir, 'bad-scenario.json');
  fs.writeFileSync(badScenario, '{ not valid json');

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
      '--scenario',
      badScenario,
      '--out',
      path.join(tmpDir, 'out.jsonl')
    ],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.equal(res.status, 2);
  assert.ok(res.stderr.length > 0);
});

test('player inside safe_radius (4.9m) is protected from edge hits and overlapping safe zones', () => {
  // Mây at 4.9m from lit L1 (safe_radius = 5.0m), shade right outside 5.0m
  const simEdge = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 14 + 4.9], flames: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 14], lit: true }],
      shades: [{ id: 'S1', pos: [0, 0, 14 + 5.05] }],
      random_motes: false,
      random_shades: false
    }
  });
  for (let i = 0; i < 30; i += 1) {
    const ev = stepSimulation(simEdge, {});
    assert.equal(ev.some((e) => e.name === 'player_hit'), false);
  }
  assert.equal(simEdge.player.flames, 3);

  // Overlapping lit lanterns L1 (-4, 0, 0) and L2 (4, 0, 0) (8m apart, safe_radius = 5.0m)
  // Shade placed at (1, 0, 0) (5m from L1, 3m from L2) must be >= 5.0m from BOTH at tick 1
  const simOverlap = createSimulationState({
    seed: 1,
    tuning,
    scenario: {
      player: { pos: [0, 0, 10] },
      lanterns: [
        { id: 'L1', pos: [-4, 0, 0], lit: true },
        { id: 'L2', pos: [4, 0, 0], lit: true }
      ],
      shades: [{ id: 'S1', pos: [1, 0, 0] }],
      random_motes: false,
      random_shades: false
    }
  });
  stepSimulation(simOverlap, {});
  const sPos = simOverlap.shades[0].pos;
  assert.ok(distXZ(sPos, [-4, 0, 0]) >= tuning.safe_radius - 1e-6);
  assert.ok(distXZ(sPos, [4, 0, 0]) >= tuning.safe_radius - 1e-6);
});

test('spawned shade IDs never collide with scenario.shades and default motes >= 40', () => {
  const sim = createSimulationState({
    seed: 42,
    tuning,
    scenario: {
      player: { pos: [0, 0, 14] },
      lanterns: [{ id: 'L1', pos: [0, 0, 14], lit: true }],
      shades: [{ id: 'S2', pos: [0, 0, -25] }],
      random_shades: true
    }
  });
  assert.equal(sim.motes.length, 40);

  let spawnedId = null;
  for (let i = 0; i < 1800; i += 1) {
    const evs = stepSimulation(sim, {});
    const sp = evs.find((e) => e.name === 'shade_spawned');
    if (sp) spawnedId = sp.data.id;
  }
  assert.equal(spawnedId, 'S3');
  const ids = sim.shades.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});
