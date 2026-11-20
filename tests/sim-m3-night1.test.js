import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createSimulationState, stepSimulation } from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
);

test('pulse (3 motes, 5m 3D, 120t stun, 4m/15t push, 180t cd, +5 score)', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 3 },
      shades: [
        { id: 'S1', pos: [0, 0, 4.5], state: 'chase' },
        { id: 'S2', pos: [0, 0, 7.5], state: 'chase' }
      ],
      random_motes: false,
      random_shades: false
    }
  });

  const ev1 = stepSimulation(sim, { pulse: true });
  const pulseEv = ev1.find((e) => e.name === 'pulse');
  assert.ok(pulseEv);
  assert.deepEqual(pulseEv.data.stunned_ids, ['S1']);
  assert.equal(sim.player.carried, 0);
  assert.equal(sim.score, 5);
  assert.equal(sim.shades[0].state, 'stunned');
  assert.equal(sim.shades[1].state, 'chase');

  // After 14 more ticks, full 4.0m push is applied
  for (let i = 0; i < 14; i += 1) {
    stepSimulation(sim, { pulse: false });
  }
  assert.ok(sim.shades[0].pos[2] >= 8.49 && sim.shades[0].pos[2] <= 8.51, `z=${sim.shades[0].pos[2]}`);

  // Cooldown blocks pulse even with 3 motes
  sim.player.carried = 3;
  const evCd = stepSimulation(sim, { pulse: true });
  assert.equal(evCd.some((e) => e.name === 'pulse'), false);
});

test('player_hit drops floor(carried/2) motes in 1.5-2.5m ring, sets 90t invuln and shade recoil', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 5, flames: 3 },
      shades: [{ id: 'S1', pos: [0, 0, 0.5], state: 'chase' }],
      random_motes: false,
      random_shades: false
    }
  });

  const ev = stepSimulation(sim, { move: [0, 0] });
  const hit = ev.find((e) => e.name === 'player_hit');
  assert.ok(hit);
  assert.deepEqual(hit.data, { by: 'shade', flames: 2, dropped: 2 });
  assert.equal(sim.player.carried, 3);
  assert.equal(sim.shades[0].state, 'recoil');

  const droppedMotes = sim.motes.filter((m) => m.kind === 'dropped' && m.active);
  assert.equal(droppedMotes.length, 2);
  for (const m of droppedMotes) {
    const d = Math.hypot(m.pos[0], m.pos[2]);
    assert.ok(d >= 1.49 && d <= 2.51, `dropped ring dist=${d}`);
  }

  // Invuln protects on next tick
  const ev2 = stepSimulation(sim, { move: [0, 0] });
  assert.equal(ev2.some((e) => e.name === 'player_hit'), false);
});

test('shades respect safe_radius (6m) and player inside safe zone is protected', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 29.9], flames: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true }],
      shades: [{ id: 'S1', pos: [0, 0, 31.1], state: 'chase' }],
      random_motes: false,
      random_shades: false
    }
  });

  for (let i = 0; i < 30; i += 1) {
    const ev = stepSimulation(sim, { move: [0, 0] });
    assert.equal(ev.some((e) => e.name === 'player_hit'), false);
    const d = Math.hypot(sim.shades[0].pos[0] - 0, sim.shades[0].pos[2] - 25);
    assert.ok(d >= 5.99, `shade dist from L1=${d}`);
  }
});

test('endings: no_flames > all_lit > dawn priority', () => {
  // Simultaneous no_flames + all_lit -> no_flames wins in v1.1
  const simBoth = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], flames: 0 },
      lanterns: [
        { id: 'L1', lit: true },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', lit: true }
      ],
      random_motes: false,
      random_shades: false
    }
  });
  const evBoth = stepSimulation(simBoth, {});
  assert.equal(simBoth.state, 'lost');
  assert.equal(evBoth.find((e) => e.name === 'game_over').data.reason, 'no_flames');

  // Simultaneous all_lit + dawn (last tick) -> all_lit wins
  const simLastTick = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 24.5], carried: 1, flames: 2 },
      lanterns: [
        { id: 'L1', deposited: 9, lit: false },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', lit: true }
      ],
      time_left_s: 1 / 60,
      random_motes: false,
      random_shades: false
    }
  });
  const evWin = stepSimulation(simLastTick, { interact: true });
  assert.equal(simLastTick.state, 'won');
  assert.equal(evWin.find((e) => e.name === 'game_over').data.reason, 'all_lit');
  // Score: 10 (deposit) + 100 (lantern) + 0*2 (time) + 2*50 (flames) = 210
  assert.equal(simLastTick.score, 210);

  // Dawn loss
  const simDawn = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      time_left_s: 1 / 60,
      random_motes: false,
      random_shades: false
    }
  });
  const evDawn = stepSimulation(simDawn, {});
  assert.equal(simDawn.state, 'lost');
  assert.equal(evDawn.find((e) => e.name === 'game_over').data.reason, 'dawn');
});

test('CLI exits with code 2 on malformed scenario JSON and default motes = 20', () => {
  const badScenarioPath = path.join('/tmp', 'bad-scenario-v11.json');
  const outPath = path.join('/tmp', 'bad-scenario-out.jsonl');
  fs.writeFileSync(badScenarioPath, '{"shades":[{"pos":[0,0,0],"state":"invalid_state"}]}', 'utf8');
  let exitCode = 0;
  try {
    execFileSync(
      'node',
      ['scripts/headless.js', '--ticks', '5', '--scenario', badScenarioPath, '--out', outPath],
      { cwd: ROOT, stdio: 'pipe' }
    );
  } catch (err) {
    exitCode = err.status;
  }
  assert.equal(exitCode, 2);

  const sim = createSimulationState({ night: 1, seed: 42, tuning: contract.tuning });
  assert.equal(sim.motes.length, 20);
  assert.equal(sim.shades.length, 0);
});
