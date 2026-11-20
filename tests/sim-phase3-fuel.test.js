import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  FormatError,
  createSimulationState,
  serializeSnapshot,
  stepSimulation,
  validateScenario
} from '../src/sim/index.js';

const contract = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
const tuning = contract.tuning;

function makeSim(scenario, night = 1) {
  return createSimulationState({
    night,
    seed: 42,
    tuning,
    scenario: { random_motes: false, random_shades: false, ...scenario }
  });
}

test('v1.2 snapshot defaults fuel and exposes dynamic capacity', () => {
  const sim = makeSim({
    player: { successful_lights: 5 },
    lanterns: [
      { id: 'L1', lit: true },
      { id: 'L2', lit: false, ever_lit: true }
    ]
  });
  const snapshot = serializeSnapshot(sim);
  assert.equal(contract.contract_version, '1.3');
  assert.equal(snapshot.player.capacity, 20);
  assert.deepEqual(
    snapshot.lanterns.slice(0, 2).map((l) => [l.fuel, l.ever_lit, l.relit_count]),
    [[100, true, 0], [0, true, 0]]
  );
});

test('fuel decays exactly 1/60 per tick and refuel rounds required motes up', () => {
  const decaying = makeSim({ lanterns: [{ id: 'L1', lit: true }] });
  for (let i = 0; i < 60; i += 1) stepSimulation(decaying, {});
  assert.equal(serializeSnapshot(decaying).lanterns[0].fuel, 99);

  const refuel = makeSim({
    player: { pos: [0, 0, 24.5], carried: 3 },
    lanterns: [
      { id: 'L1', lit: true, fuel: 99.9 },
      { id: 'L2', pos: [0.5, 0, 24.5], lit: true, fuel: 100 }
    ]
  });
  const events = stepSimulation(refuel, { interact: true });
  const event = events.find((e) => e.name === 'refuel');
  assert.deepEqual(event.data, { lantern_id: 'L1', amount: 1, fuel: 100 });
  assert.equal(refuel.player.carried, 2);
  assert.equal(refuel.score, 5);
});

test('lantern can go out and relight in one tick for 5 motes', () => {
  const sim = makeSim({
    player: { pos: [0, 0, 24.5], carried: 5 },
    lanterns: [{ id: 'L1', lit: true, fuel: 1 / 60 }]
  });
  const events = stepSimulation(sim, { interact: true });
  assert.deepEqual(
    events.filter((e) => ['lantern_out', 'deposit', 'lantern_lit'].includes(e.name)).map((e) => e.name),
    ['lantern_out', 'deposit', 'lantern_lit']
  );
  const lit = events.find((e) => e.name === 'lantern_lit');
  assert.equal(lit.data.relight, true);
  assert.equal(sim.lanterns[0].fuelUnits, 6000);
  assert.equal(sim.lanterns[0].relitCount, 1);
  assert.equal(sim.player.capacity, 12);
  assert.equal(sim.score, 65);
});

test('drain stacks with passive decay, reports every 60 ticks, and pulse awards 15', () => {
  const draining = makeSim({
    player: { pos: [20, 0, 0] },
    lanterns: [{ id: 'L1', lit: true, fuel: 29 }],
    shades: [{ id: 'S1', pos: [0, 0, 25], state: 'drain', target_lantern_id: 'L1' }]
  });
  let drainEvent = null;
  for (let i = 0; i < 60; i += 1) {
    drainEvent = stepSimulation(draining, {}).find((e) => e.name === 'fuel_drain') ?? drainEvent;
  }
  assert.equal(serializeSnapshot(draining).lanterns[0].fuel, 23);
  assert.deepEqual(drainEvent.data, { lantern_id: 'L1', shade_id: 'S1', fuel: 23 });

  const pulsed = makeSim({
    player: { pos: [0, 0, 24], carried: 3 },
    lanterns: [{ id: 'L1', lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 0, 25], state: 'drain', target_lantern_id: 'L1' }]
  });
  stepSimulation(pulsed, { pulse: true });
  assert.equal(pulsed.score, 15);
  assert.equal(pulsed.shades[0].state, 'stunned');
});

test('all lamps no longer win early; dawn needs ceil(60%) and awards fuel bonus', () => {
  const allLit = ['L1', 'L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true }));
  const early = makeSim({ lanterns: allLit, time_left_s: 2 / 60 });
  stepSimulation(early, {});
  assert.equal(early.state, 'playing');

  const threshold = makeSim({
    player: { flames: 3 },
    lanterns: [
      { id: 'L1', lit: true },
      { id: 'L2', lit: true },
      { id: 'L3', lit: true }
    ],
    time_left_s: 1 / 60
  });
  const events = stepSimulation(threshold, {});
  assert.equal(threshold.state, 'won');
  assert.equal(threshold.endReason, 'dawn_survived');
  assert.equal(events.find((e) => e.name === 'game_over').data.reason, 'dawn_survived');
  assert.equal(threshold.score, 597);
});

test('scenario validation accepts drain fields and rejects invalid fuel', () => {
  assert.doesNotThrow(() => validateScenario({
    player: { successful_lights: 2 },
    lanterns: [{ id: 'L1', lit: true, fuel: 30, ever_lit: true }],
    shades: [{ pos: [0, 0, 0], state: 'drain', target_lantern_id: 'L1' }]
  }));
  assert.throws(
    () => validateScenario({ lanterns: [{ id: 'L1', fuel: 101 }] }),
    FormatError
  );
});

test('two draining Shades stack; exact 30 fuel keeps the safe zone', () => {
  const stacked = makeSim({
    player: { pos: [20, 0, 0] },
    lanterns: [{ id: 'L1', lit: true, fuel: 30 }],
    shades: [
      { id: 'S1', pos: [0, 0, 25], state: 'drain', target_lantern_id: 'L1' },
      { id: 'S2', pos: [0.5, 0, 25], state: 'drain', target_lantern_id: 'L1' }
    ]
  });
  let events = [];
  for (let i = 0; i < 60; i += 1) events = events.concat(stepSimulation(stacked, {}));
  assert.equal(serializeSnapshot(stacked).lanterns[0].fuel, 19);
  assert.deepEqual(
    events.filter((e) => e.name === 'fuel_drain').map((e) => e.data.shade_id),
    ['S1', 'S2']
  );

  const boundary = makeSim({
    player: { pos: [0, 0, 29.9], flames: 3 },
    lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 30 + 1 / 60 }],
    shades: [{ id: 'S1', pos: [0, 0, 30.7], state: 'chase' }]
  });
  const hit = stepSimulation(boundary, {}).find((e) => e.name === 'player_hit');
  assert.equal(serializeSnapshot(boundary).lanterns[0].fuel, 30);
  assert.equal(hit, undefined);
  assert.ok(Math.hypot(boundary.shades[0].pos[0], boundary.shades[0].pos[2] - 25) >= 5.99);
});

test('refueling across 30 fuel pushes nearby Shades out within 30 ticks', () => {
  const sim = makeSim({
    player: { pos: [0, 0, 25], carried: 1, flames: 3 },
    lanterns: [{ id: 'L1', lit: true, fuel: 29 }],
    shades: [{ id: 'S1', pos: [0, 0, 27], state: 'wander' }]
  });
  const first = stepSimulation(sim, { interact: true });
  assert.ok(first.some((e) => e.name === 'refuel'));
  assert.ok(sim.shades[0].safePushTicksLeft > 0);
  assert.equal(first.some((e) => e.name === 'player_hit'), false);
  for (let i = 1; i < 30; i += 1) stepSimulation(sim, { interact: false });
  const distance = Math.hypot(sim.shades[0].pos[0], sim.shades[0].pos[2] - 25);
  assert.ok(distance >= 5.99, `distance=${distance}`);
  assert.equal(sim.player.flames, 3);
});

test('dawn threshold is 3/5, 4/6, and 5/7 across all nights', () => {
  for (const [night, required] of [[1, 3], [2, 4], [3, 5]]) {
    const base = makeSim({}, night);
    const lit = base.lanterns.slice(0, required).map((l) => ({ id: l.id, lit: true }));
    const won = makeSim({ lanterns: lit, time_left_s: 1 / 60 }, night);
    stepSimulation(won, {});
    assert.equal(won.endReason, 'dawn_survived', `night ${night}`);

    const lost = makeSim({ lanterns: lit.slice(0, -1), time_left_s: 1 / 60 }, night);
    stepSimulation(lost, {});
    assert.equal(lost.endReason, 'dawn', `night ${night}`);
  }
});
