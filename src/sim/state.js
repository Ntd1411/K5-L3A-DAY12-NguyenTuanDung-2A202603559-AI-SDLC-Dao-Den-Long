import { createRng } from './rng.js';
import { SIM_DT, TICK_RATE, round3, roundPos } from './math.js';
import { getGroundHeight, getMapConfig } from './maps.js';

function pickDistinctIndices(rng, total, count) {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, total));
}

function generateInitialMotes(rng, map, multiplier = 1) {
  const chosen = pickDistinctIndices(rng, map.moteSpawns.length, 20);
  const motes = chosen.map((idx, i) => ({
    id: `M${i + 1}`,
    pos: [...map.moteSpawns[idx]],
    active: true,
    kind: 'random',
    ttlTicks: null,
    spawnedThisTick: false
  }));
  const targetCount = 20 * multiplier;
  let attempts = 0;
  while (motes.length < targetCount && attempts < targetCount * 8) {
    attempts += 1;
    const base = map.moteSpawns[Math.floor(rng() * map.moteSpawns.length)];
    const angle = rng() * Math.PI * 2;
    const jitter = 2.0 + rng() * 5.5;
    const x = round3(base[0] + Math.cos(angle) * jitter);
    const z = round3(base[2] + Math.sin(angle) * jitter);
    const gy = getGroundHeight(map.night, x, z, base[1] + 0.5);
    if (gy !== null && Math.abs(gy - base[1]) <= 0.5) {
      motes.push({
        id: `M${motes.length + 1}`,
        pos: [x, gy, z],
        active: true,
        kind: 'random',
        ttlTicks: null,
        spawnedThisTick: false
      });
    }
  }
  return motes;
}

function maxNumericId(items, prefix) {
  let maxNum = items.length;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const item of items) {
    const match = re.exec(item.id);
    if (match) {
      maxNum = Math.max(maxNum, Number(match[1]));
    }
  }
  return maxNum;
}

/**
 * Create initial simulation state from night, seed, tuning, and optional validated scenario.
 */
export function createSimulationState({
  night = 1,
  seed = 42,
  tuning,
  scenario = null,
  benchMode = false,
  moteMultiplier = 1
}) {
  const rng = createRng(seed);
  const map = getMapConfig(night);
  const fuelMaxUnits = Math.round(tuning.fuel_max * TICK_RATE);

  if (benchMode) {
    const benchLanterns = map.lanterns.map((entry, idx) => ({
      id: entry.id,
      pos: [...entry.pos],
      lit: idx < 3,
      deposited: idx < 3 ? tuning.lantern_cost : 0,
      fuelUnits: idx < 3 ? fuelMaxUnits : 0,
      everLit: idx < 3,
      relitCount: 0
    }));
    const benchMotes = [];
    for (let i = 0; i < 100; i += 1) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 36;
      benchMotes.push({
        id: `M${i + 1}`,
        pos: [round3(Math.cos(a) * r), 0, round3(Math.sin(a) * r)],
        active: true,
        kind: 'random',
        ttlTicks: null,
        spawnedThisTick: false
      });
    }
    const benchShades = [];
    for (let i = 0; i < 200; i += 1) {
      const a = rng() * Math.PI * 2;
      const r = 8 + Math.sqrt(rng()) * 29;
      benchShades.push({
        id: `S${i + 1}`,
        pos: [round3(Math.cos(a) * r), 0, round3(Math.sin(a) * r)],
        state: 'wander',
        stateTicksLeft: 0,
        pushTicksLeft: 0,
        pushDir: [1, 0],
        safePushTicksLeft: 0,
        targetLanternId: null,
        drainTicks: 0,
        wanderAngle: rng() * Math.PI * 2,
        spawnedThisTick: false
      });
    }
    return {
      night: 1,
      map,
      seed,
      tuning,
      rng,
      benchMode: true,
      tick: 0,
      simTick: 0,
      state: 'playing',
      endReason: null,
      initialTimeLeftS: tuning.night1_duration_s,
      timeLeftTicks: Math.round(tuning.night1_duration_s * TICK_RATE),
      timeLeftS: tuning.night1_duration_s,
      score: 0,
      player: {
        pos: [0, 0, 0],
        vel: [0, 0, 0],
        grounded: true,
        facingYawDeg: 0,
        flames: tuning.flames,
        carried: 0,
        capacity: 10,
        successfulLights: 0,
        invulnTicks: 0,
        dashTicks: 0,
        dashDir: [0, 1],
        dashCdTicks: 0,
        pulseCdTicks: 0,
        charmTicks: 0,
        respawnTicks: 0,
        launched: false,
        launchVel: [0, 0]
      },
      lanterns: benchLanterns,
      motes: benchMotes,
      shades: benchShades,
      drifters: [],
      charms: [],
      randomMotes: false,
      randomShades: false,
      randomDrifters: false,
      windEnabled: false,
      wind: { active: false, warning: false, dirDeg: 0, dirVec: [1, 0], ticksLeft: 0 },
      nextMoteIndex: 101,
      nextShadeIndex: 201,
      nextDrifterIndex: 1,
      prevInput: {
        move: [0, 0],
        cam_yaw_deg: 0,
        jump: false,
        interact: false,
        pulse: false,
        dash: false,
        pause: false
      }
    };
  }

  const lanterns = map.lanterns.map((entry) => ({
    id: entry.id,
    pos: [...entry.pos],
    lit: false,
    deposited: 0,
    fuelUnits: 0,
    everLit: false,
    relitCount: 0
  }));

  if (scenario?.lanterns) {
    for (const override of scenario.lanterns) {
      const target = lanterns.find((l) => l.id === override.id);
      if (!target) continue;
      if (override.pos) target.pos = [...override.pos];
      if (override.deposited !== undefined) target.deposited = override.deposited;
      if (override.ever_lit !== undefined) target.everLit = override.ever_lit;
      if (override.relit_count !== undefined) target.relitCount = override.relit_count;
      if (override.lit !== undefined) {
        target.lit = override.lit;
        if (override.lit && override.deposited === undefined) {
          target.deposited = tuning.lantern_cost;
        }
      }
      if (override.fuel !== undefined) {
        target.fuelUnits = Math.max(0, Math.min(fuelMaxUnits, Math.round(override.fuel * TICK_RATE)));
      } else if (target.lit) {
        target.fuelUnits = fuelMaxUnits;
      }
      if (target.lit) target.everLit = override.ever_lit ?? true;
      if (!target.lit) target.fuelUnits = 0;
    }
  }

  const randomMotes = scenario?.random_motes !== false;
  let motes = [];
  if (scenario?.motes !== undefined) {
    motes = scenario.motes.map((m, idx) => {
      const isArr = Array.isArray(m);
      const kind = isArr ? 'random' : (m.kind ?? 'random');
      let ttlTicks = null;
      if (!isArr) {
        if (m.ttl_ticks !== undefined) ttlTicks = m.ttl_ticks;
        else if (m.ttl_s !== undefined) ttlTicks = Math.round(m.ttl_s * TICK_RATE);
        else if (kind === 'dropped') ttlTicks = 480;
      }
      return {
        id: isArr ? `M${idx + 1}` : (m.id ?? `M${idx + 1}`),
        pos: isArr ? [...m] : [...m.pos],
        active: true,
        kind,
        ttlTicks,
        spawnedThisTick: false
      };
    });
  } else if (randomMotes) {
    motes = generateInitialMotes(rng, map, moteMultiplier);
  }

  const randomShades = scenario?.random_shades !== false;
  let shades = [];
  if (scenario?.shades !== undefined) {
    shades = scenario.shades.map((s, idx) => {
      const state = s.state ?? 'chase';
      let stateTicksLeft = s.state_ticks_left ?? 0;
      if (s.state_ticks_left === undefined) {
        if (state === 'stunned') stateTicksLeft = Math.round(tuning.pulse_stun_s * TICK_RATE);
        else if (state === 'recoil') stateTicksLeft = 60;
        else if (state === 'spawning') stateTicksLeft = 30;
      }
      return {
        id: s.id ?? `S${idx + 1}`,
        pos: [...s.pos],
        state,
        stateTicksLeft,
        pushTicksLeft: 0,
        pushDir: [1, 0],
        safePushTicksLeft: 0,
        targetLanternId: s.target_lantern_id ?? null,
        drainTicks: 0,
        wanderAngle: rng() * Math.PI * 2,
        spawnedThisTick: false
      };
    });
  }

  const randomDrifters = scenario?.random_drifters !== undefined
    ? scenario.random_drifters
    : map.hasDrifters;
  let drifters = [];
  if (scenario?.drifters !== undefined) {
    drifters = scenario.drifters.map((d, idx) => ({
      id: d.id ?? `D${idx + 1}`,
      pos: [...d.pos],
      state: d.state ?? 'idle',
      stolen: d.stolen ?? 0,
      hasStolen: (d.stolen ?? 0) > 0 || d.state === 'flee',
      stateTicksLeft: d.state_ticks_left ?? (d.state === 'flee' ? 240 : 0),
      wanderAngle: rng() * Math.PI * 2,
      spawnedThisTick: false
    }));
  }

  let charms = [];
  if (scenario?.charms !== undefined) {
    charms = scenario.charms.map((c) => {
      const defaultDef = map.charms.find((mc) => mc.id === c.id);
      const pos = c.pos ? [...c.pos] : (defaultDef ? [...defaultDef.pos] : [0, 0, 0]);
      const available = c.available !== undefined ? c.available : true;
      let respawnTicks = 0;
      if (!available) {
        if (c.respawn_ticks !== undefined) respawnTicks = c.respawn_ticks;
        else if (c.respawn_s !== undefined) respawnTicks = Math.round(c.respawn_s * TICK_RATE);
      }
      return {
        id: c.id,
        pos,
        available,
        respawnTicks
      };
    });
  } else {
    charms = map.charms.map((c) => ({
      id: c.id,
      pos: [...c.pos],
      available: true,
      respawnTicks: 0
    }));
  }

  const startPos = scenario?.player?.pos ? [...scenario.player.pos] : [...map.spawn];
  const groundAtStart = getGroundHeight(map.night, startPos[0], startPos[2], startPos[1]);
  const grounded = groundAtStart !== null && startPos[1] <= groundAtStart + 0.0001;

  const player = {
    pos: startPos,
    vel: [0, 0, 0],
    grounded,
    facingYawDeg: 0,
    flames: scenario?.player?.flames ?? tuning.flames,
    carried: scenario?.player?.carried ?? 0,
    successfulLights: scenario?.player?.successful_lights ?? 0,
    capacity: 0,
    invulnTicks: scenario?.player?.invuln_ticks ?? 0,
    dashTicks: 0,
    dashDir: [0, 1],
    dashCdTicks: scenario?.player?.dash_cd_ticks ?? 0,
    pulseCdTicks: scenario?.player?.pulse_cd_ticks ?? 0,
    charmTicks: scenario?.player?.charm_ticks ?? 0,
    respawnTicks: 0,
    launched: false,
    launchVel: [0, 0]
  };
  player.capacity = Math.min(
    tuning.capacity_max,
    tuning.carry_capacity + 2 * player.successfulLights
  );

  const durationS = scenario?.time_left_s ?? tuning[map.durationKey];
  const initialTimeLeftTicks = Math.round(durationS * TICK_RATE);

  const windEnabled = scenario?.wind_enabled !== undefined
    ? scenario.wind_enabled
    : map.hasWind;

  return {
    night: map.night,
    map,
    seed,
    tuning,
    rng,
    tick: 0,
    simTick: 0,
    state: 'playing',
    endStateBeforePause: 'playing',
    endReason: null,
    initialTimeLeftS: durationS,
    timeLeftTicks: initialTimeLeftTicks,
    timeLeftS: durationS,
    score: 0,
    player,
    lanterns,
    motes,
    shades,
    drifters,
    charms,
    randomMotes,
    moteCap: 30 * moteMultiplier,
    randomShades,
    randomDrifters,
    windEnabled,
    wind: {
      active: false,
      warning: false,
      dirDeg: 0,
      dirVec: [1, 0],
      ticksLeft: 0
    },
    nextMoteIndex: maxNumericId(motes, 'M') + 1,
    nextShadeIndex: maxNumericId(shades, 'S') + 1,
    nextDrifterIndex: maxNumericId(drifters, 'D') + 1,
    prevInput: {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false
    }
  };
}

/**
 * Serialize current simulation state into a Test Contract v1.2 snapshot record.
 */
export function serializeSnapshot(sim) {
  const activeMotes = sim.motes.filter((m) => m.active);
  const activeDrifters = sim.drifters.filter((d) => d.state !== 'removed');
  return {
    type: 'snapshot',
    tick: sim.tick,
    sim_tick: sim.simTick,
    night: sim.night,
    state: sim.state,
    time_left_s: round3(sim.timeLeftS),
    score: sim.score,
    wind: {
      active: sim.wind.active,
      dir_deg: round3(sim.wind.dirDeg)
    },
    player: {
      pos: roundPos(sim.player.pos),
      vel: roundPos(sim.player.vel),
      grounded: sim.player.grounded,
      flames: sim.player.flames,
      carried: sim.player.carried,
      capacity: sim.player.capacity,
      invuln: sim.player.invulnTicks > 0,
      dash_cd_s: round3(sim.player.dashCdTicks * SIM_DT),
      pulse_cd_s: round3(sim.player.pulseCdTicks * SIM_DT),
      charm_s: round3(sim.player.charmTicks * SIM_DT)
    },
    lanterns: sim.lanterns.map((l) => ({
      id: l.id,
      pos: roundPos(l.pos),
      lit: l.lit,
      deposited: l.deposited,
      fuel: Number((l.fuelUnits / TICK_RATE).toFixed(1)),
      ever_lit: l.everLit,
      relit_count: l.relitCount
    })),
    shades: sim.shades.map((s) => ({
      id: s.id,
      pos: roundPos(s.pos),
      state: s.state
    })),
    drifters: activeDrifters.map((d) => ({
      id: d.id,
      pos: roundPos(d.pos),
      state: d.state,
      stolen: d.stolen
    })),
    charms: sim.charms.map((c) => ({
      id: c.id,
      available: c.available,
      respawn_s: round3(c.respawnTicks * SIM_DT)
    })),
    motes_active: activeMotes.length,
    motes: activeMotes.map((m) => ({
      id: m.id,
      pos: roundPos(m.pos),
      kind: m.kind,
      ttl_s: m.ttlTicks === null ? null : round3(m.ttlTicks * SIM_DT)
    }))
  };
}

/**
 * Serialize the final end record according to Test Contract v1.2.
 */
export function serializeEnd(sim) {
  const endState = sim.state === 'paused' ? 'playing' : sim.state;
  return {
    type: 'end',
    ticks: sim.tick,
    state: endState,
    score: sim.score
  };
}
