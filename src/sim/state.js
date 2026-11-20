import { createRng } from './rng.js';
import { ISLAND_RADIUS, round3, roundPos } from './math.js';

export const DEFAULT_LANTERN_LAYOUT = [
  { id: 'L1', pos: [0, 0, 14] },
  { id: 'L2', pos: [18, 0, 10] },
  { id: 'L3', pos: [-18, 0, 10] },
  { id: 'L4', pos: [15, 0, -16] },
  { id: 'L5', pos: [-15, 0, -16] }
];

const STARTER_MOTE_POSITIONS = [
  [0, 0, 3.2],
  [0, 0, 6.0],
  [1.4, 0, 8.8],
  [-1.4, 0, 8.8],
  [0, 0, 11.4],
  [2.2, 0, 14.0]
];

function generateDefaultMotes(rng, count = 32) {
  const motes = [];
  let nextId = 1;
  for (const pos of STARTER_MOTE_POSITIONS) {
    motes.push({
      id: `M${nextId++}`,
      pos: [...pos],
      active: true
    });
  }
  while (motes.length < count) {
    const angle = rng() * Math.PI * 2;
    const radius = 6 + Math.sqrt(rng()) * (ISLAND_RADIUS - 9);
    const x = round3(Math.cos(angle) * radius);
    const z = round3(Math.sin(angle) * radius);
    motes.push({
      id: `M${nextId++}`,
      pos: [x, 0, z],
      active: true
    });
  }
  return motes;
}

/**
 * Create initial simulation state from seed, tuning, and optional validated scenario.
 * Emits no events and grants no score.
 */
export function createSimulationState({ seed = 42, tuning, scenario = null }) {
  const rng = createRng(seed);

  const lanterns = DEFAULT_LANTERN_LAYOUT.map((entry) => ({
    id: entry.id,
    pos: [...entry.pos],
    lit: false,
    deposited: 0
  }));

  if (scenario?.lanterns) {
    for (const override of scenario.lanterns) {
      const target = lanterns.find((l) => l.id === override.id);
      if (!target) continue;
      if (override.pos) target.pos = [...override.pos];
      if (override.deposited !== undefined) target.deposited = override.deposited;
      if (override.lit !== undefined) {
        target.lit = override.lit;
        if (override.lit && override.deposited === undefined) {
          target.deposited = tuning.lantern_cost;
        }
      }
    }
  }

  let motes = [];
  if (scenario?.motes !== undefined) {
    motes = scenario.motes.map((m, idx) => ({
      id: Array.isArray(m) ? `M${idx + 1}` : (m.id ?? `M${idx + 1}`),
      pos: Array.isArray(m) ? [...m] : [...m.pos],
      active: true
    }));
  } else if (scenario?.random_motes !== false) {
    motes = generateDefaultMotes(rng);
  }

  let shades = [];
  const randomShades = scenario?.random_shades !== false;
  if (scenario?.shades !== undefined) {
    shades = scenario.shades.map((s, idx) => ({
      id: s.id ?? `S${idx + 1}`,
      pos: [...s.pos],
      state: s.state ?? 'chase',
      stunTimer: s.state === 'stunned' ? tuning.pulse_stun_s : 0
    }));
  } else if (randomShades) {
    shades = [
      { id: 'S1', pos: [-20, 0, -10], state: 'chase', stunTimer: 0 },
      { id: 'S2', pos: [20, 0, -10], state: 'chase', stunTimer: 0 }
    ];
  }

  const player = {
    pos: scenario?.player?.pos ? [...scenario.player.pos] : [0, 0, 0],
    vy: 0,
    grounded: !scenario?.player?.pos || scenario.player.pos[1] <= 0.0001,
    facingYawDeg: 0,
    flames: scenario?.player?.flames ?? tuning.flames,
    carried: scenario?.player?.carried ?? 0,
    invulnTimer: 0,
    pulseCooldown: 0
  };

  const initialTimeLeftS = scenario?.time_left_s ?? tuning.night1_duration_s;

  return {
    seed,
    tuning,
    rng,
    tick: 0,
    simTick: 0,
    state: 'playing',
    endReason: null,
    initialTimeLeftS,
    timeLeftS: initialTimeLeftS,
    score: 0,
    player,
    lanterns,
    motes,
    shades,
    randomShades,
    nextShadeIndex: shades.length + 1,
    prevInput: {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false
    }
  };
}

/**
 * Serialize current simulation state into a Test Contract v1.0 snapshot record.
 */
export function serializeSnapshot(sim) {
  return {
    type: 'snapshot',
    tick: sim.tick,
    sim_tick: sim.simTick,
    state: sim.state,
    time_left_s: round3(sim.timeLeftS),
    score: sim.score,
    player: {
      pos: roundPos(sim.player.pos),
      flames: sim.player.flames,
      carried: sim.player.carried
    },
    lanterns: sim.lanterns.map((l) => ({
      id: l.id,
      pos: roundPos(l.pos),
      lit: l.lit,
      deposited: l.deposited
    })),
    shades: sim.shades.map((s) => ({
      id: s.id,
      pos: roundPos(s.pos),
      state: s.state
    })),
    motes_active: sim.motes.reduce((acc, m) => acc + (m.active ? 1 : 0), 0),
    motes: sim.motes
      .filter((m) => m.active)
      .map((m) => ({
        id: m.id,
        pos: roundPos(m.pos)
      }))
  };
}

/**
 * Serialize the final end record according to Test Contract v1.0.
 */
export function serializeEnd(sim) {
  return {
    type: 'end',
    ticks: sim.tick,
    state: sim.state,
    score: sim.score
  };
}
