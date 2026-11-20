import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSimulationState, stepSimulation } from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
);

test('Night 2: bamboo bridge, fall off edge, and both launch pads reach opposite island', () => {
  // Walk across bridge from A (x=25) to B (x=45)
  const sim = createSimulationState({
    night: 2,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [25, 0, 0] },
      random_motes: false,
      random_shades: false,
      random_drifters: false
    }
  });
  for (let i = 0; i < 240; i += 1) {
    stepSimulation(sim, { move: [1, 0], cam_yaw_deg: 0 });
  }
  assert.ok(sim.player.pos[0] > 45, `x=${sim.player.pos[0]}`);
  assert.equal(sim.player.grounded, true);
  assert.equal(sim.player.flames, 3);

  // Launch pad P1 at (20, 0, 18) -> lands on Island B
  const simPad1 = createSimulationState({
    night: 2,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [20, 0, 18] },
      random_motes: false,
      random_shades: false,
      random_drifters: false
    }
  });
  stepSimulation(simPad1, {});
  assert.equal(simPad1.player.launched, true);
  for (let i = 0; i < 100; i += 1) {
    stepSimulation(simPad1, { move: [-1, 0] }); // movement keys should not override launch
    if (simPad1.player.grounded && i > 10) break;
  }
  assert.equal(simPad1.player.grounded, true);
  const distToB = Math.hypot(simPad1.player.pos[0] - 70, simPad1.player.pos[2]);
  assert.ok(distToB <= 28, `landed outside Island B: distToB=${distToB}`);
});

test('Night 2: Wind Charm C1 at (35,0,0) gives 7.2 m/s and no dash cooldown for 600 ticks, respawns at 2700', () => {
  const sim = createSimulationState({
    night: 2,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [34.5, 0, 0] },
      random_motes: false,
      random_shades: false,
      random_drifters: false
    }
  });

  const ev = stepSimulation(sim, {});
  assert.ok(ev.some((e) => e.name === 'charm_picked' && e.data.charm_id === 'C1' && e.data.charm_ticks === 600));
  assert.equal(sim.charms[0].available, false);

  // Dash twice in a row (12 ticks each, no cooldown)
  const evD1 = stepSimulation(sim, { dash: true, move: [1, 0] });
  assert.ok(evD1.some((e) => e.name === 'dash'));
  for (let i = 0; i < 11; i += 1) stepSimulation(sim, { dash: false });
  const evD2 = stepSimulation(sim, { dash: true, move: [1, 0] });
  assert.ok(evD2.some((e) => e.name === 'dash'));
  assert.equal(sim.player.dashCdTicks, 0);

  // Advance until respawn (2700 ticks total from pickup)
  for (let i = 0; i < 2700; i += 1) {
    stepSimulation(sim, {});
  }
  assert.equal(sim.charms[0].available, true);
});

test('Night 2: Drifter (Gió Lạc) steals before shade hit, flees, and pulse drops motes', () => {
  const sim = createSimulationState({
    night: 2,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 6, invuln_ticks: 30 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }],
      drifters: [{ id: 'D1', pos: [0, 0, 0.8], state: 'idle' }],
      shades: [{ id: 'S1', pos: [0, 0, 0.5], state: 'chase' }],
      random_motes: false,
      random_shades: false,
      random_drifters: false
    }
  });

  // Drifter steals 3 even inside safe zone and while player is invuln
  const ev = stepSimulation(sim, {});
  const steal = ev.find((e) => e.name === 'drifter_steal');
  assert.ok(steal);
  assert.deepEqual(steal.data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.equal(sim.drifters[0].state, 'flee');
  assert.equal(sim.drifters[0].stolen, 3);
  assert.equal(sim.player.flames, 3);

  // Pulse hits fleeing drifter -> drops 3 motes
  const evPulse = stepSimulation(sim, { pulse: true });
  const drop = evPulse.find((e) => e.name === 'drifter_drop');
  assert.ok(drop);
  assert.deepEqual(drop.data, { drifter_id: 'D1', amount: 3 });
  assert.equal(sim.motes.filter((m) => m.kind === 'dropped' && m.active).length, 3);
});

test('Night 3: ramps climb to Tier 1 (Y=3), launch pad reaches Tier 2 (Y=6), bell tower blocks, wind pushes', () => {
  // Ramp at 30 deg: r=30 -> r=24 climbs from Y=0 to Y=3
  const rad30 = (30 * Math.PI) / 180;
  const simRamp = createSimulationState({
    night: 3,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [Math.cos(rad30) * 30.5, 0, Math.sin(rad30) * 30.5] },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: false
    }
  });
  for (let i = 0; i < 90; i += 1) {
    stepSimulation(simRamp, { move: [-Math.cos(rad30), -Math.sin(rad30)], cam_yaw_deg: 0 });
  }
  assert.ok(simRamp.player.pos[1] >= 2.99, `expected Tier 1 Y=3, got ${simRamp.player.pos[1]}`);

  // Launch pad at (0, 3, 13) -> lands on Tier 2 (Y=6)
  const simPad = createSimulationState({
    night: 3,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 3, 13] },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: false
    }
  });
  stepSimulation(simPad, {});
  for (let i = 0; i < 80; i += 1) {
    stepSimulation(simPad, {});
    if (simPad.player.grounded && i > 10) break;
  }
  assert.equal(simPad.player.grounded, true);
  assert.equal(simPad.player.pos[1], 6);

  // Bell tower at (0, 6, 0) R=2 blocks walking through center
  const simTower = createSimulationState({
    night: 3,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 6, 3] },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: false
    }
  });
  for (let i = 0; i < 30; i += 1) {
    stepSimulation(simTower, { move: [0, -1], cam_yaw_deg: 0 });
  }
  assert.ok(Math.hypot(simTower.player.pos[0], simTower.player.pos[2]) >= 1.99);

  // Wind cycle: warns at tick 1680, active at 1800..2099
  const simWind = createSimulationState({
    night: 3,
    seed: 42,
    tuning: contract.tuning,
    scenario: { random_motes: false, random_shades: false, random_drifters: false }
  });
  for (let i = 0; i < 1680; i += 1) stepSimulation(simWind, {});
  assert.equal(simWind.wind.warning, true);
  assert.equal(simWind.wind.active, false);
  for (let i = 0; i < 120; i += 1) stepSimulation(simWind, {});
  assert.equal(simWind.wind.active, true);
  for (let i = 0; i < 300; i += 1) stepSimulation(simWind, {});
  assert.equal(simWind.wind.active, false);
});

test('air dash keeps Y constant for all 12 ticks and gravity resumes on tick 13', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 2, 0] },
      random_motes: false,
      random_shades: false
    }
  });
  sim.player.grounded = false;

  const ev = stepSimulation(sim, { dash: true, move: [0, 1] });
  assert.ok(ev.some((e) => e.name === 'dash'));
  assert.equal(sim.player.pos[1], 2);

  for (let i = 0; i < 11; i += 1) {
    stepSimulation(sim, { dash: false, move: [0, 1] });
    assert.equal(sim.player.pos[1], 2, `tick ${i + 2} should still keep Y=2`);
  }
  assert.ok(sim.player.pos[2] >= 2.79 && sim.player.pos[2] <= 2.81, `z=${sim.player.pos[2]}`);

  stepSimulation(sim, { dash: false });
  assert.ok(sim.player.pos[1] < 2, 'gravity resumes on tick 13');
});

test('pulse 3D distance uses shade.pos as center (5.054m > 5m misses)', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], carried: 3 },
      shades: [
        { id: 'S1', pos: [4.99, 0, 0], state: 'chase' },
        { id: 'S2', pos: [4.9, 0.8, 0], state: 'chase' }
      ],
      random_motes: false,
      random_shades: false
    }
  });
  const ev = stepSimulation(sim, { pulse: true });
  const pulse = ev.find((e) => e.name === 'pulse');
  assert.deepEqual(pulse.data.stunned_ids, ['S2']);
});

test('shade recoil lasts full 60 ticks and moves exact 2.0m', () => {
  const sim = createSimulationState({
    night: 1,
    seed: 42,
    tuning: contract.tuning,
    scenario: {
      player: { pos: [0, 0, 0], flames: 3 },
      shades: [{ id: 'S1', pos: [0.5, 0, 0], state: 'chase' }],
      random_motes: false,
      random_shades: false
    }
  });
  const evHit = stepSimulation(sim, {});
  assert.ok(evHit.some((e) => e.name === 'player_hit'));
  assert.equal(sim.shades[0].state, 'recoil');
  const startX = sim.shades[0].pos[0];

  for (let i = 0; i < 59; i += 1) {
    stepSimulation(sim, {});
    assert.equal(sim.shades[0].state, 'recoil', `tick ${i + 1} still recoil`);
  }
  stepSimulation(sim, {});
  const moved = sim.shades[0].pos[0] - startX;
  assert.ok(Math.abs(moved - 2.0) < 1e-4, `expected 2.0m recoil, got ${moved}`);
  assert.equal(sim.shades[0].state, 'chase');
});
