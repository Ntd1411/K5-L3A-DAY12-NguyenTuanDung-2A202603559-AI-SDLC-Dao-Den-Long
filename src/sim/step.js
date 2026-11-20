import { SIM_DT, clampToIsland, distXZ } from './math.js';

const JUMP_VELOCITY = 7.5;
const GRAVITY = 20.0;

/**
 * Find the nearest unlit lantern within interact_radius on the XZ plane.
 * Ties are broken deterministically by ascending lantern ID.
 */
export function findNearestInteractableLantern(sim) {
  let best = null;
  let bestDist = Infinity;
  for (const lantern of sim.lanterns) {
    if (lantern.lit) continue;
    const d = distXZ(sim.player.pos, lantern.pos);
    if (d <= sim.tuning.interact_radius) {
      if (
        d < bestDist - 1e-9 ||
        (Math.abs(d - bestDist) <= 1e-9 && (!best || lantern.id < best.id))
      ) {
        best = lantern;
        bestDist = d;
      }
    }
  }
  return best;
}

/**
 * Advance simulation by one fixed 1/60s tick using the supplied input patch.
 * @param {object} sim
 * @param {object|null} framePatch
 * @returns {Array<object>} events emitted during this tick
 */
export function stepSimulation(sim, framePatch = null) {
  if (sim.state !== 'playing') {
    return [];
  }

  const prev = sim.prevInput;
  const input = {
    move: framePatch?.move ? [framePatch.move[0], framePatch.move[1]] : [...prev.move],
    cam_yaw_deg:
      framePatch?.cam_yaw_deg !== undefined ? framePatch.cam_yaw_deg : prev.cam_yaw_deg,
    jump: framePatch?.jump !== undefined ? framePatch.jump : prev.jump,
    interact: framePatch?.interact !== undefined ? framePatch.interact : prev.interact,
    pulse: framePatch?.pulse !== undefined ? framePatch.pulse : prev.pulse,
    dash: framePatch?.dash !== undefined ? framePatch.dash : prev.dash
  };

  const jumpTriggered = input.jump && !prev.jump;
  const interactTriggered = input.interact && !prev.interact;
  const pulseTriggered = input.pulse && !prev.pulse;

  const nextTick = sim.tick + 1;
  const events = [];

  sim.player.invulnTimer = Math.max(0, sim.player.invulnTimer - SIM_DT);
  sim.player.pulseCooldown = Math.max(0, sim.player.pulseCooldown - SIM_DT);

  // 1. Horizontal movement transformed by camera yaw
  let mx = Math.max(-1, Math.min(1, input.move[0]));
  let mz = Math.max(-1, Math.min(1, input.move[1]));
  const moveMag = Math.hypot(mx, mz);
  if (moveMag > 1) {
    mx /= moveMag;
    mz /= moveMag;
  }

  const theta = (input.cam_yaw_deg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const wx = mx * cosT + mz * sinT;
  const wz = -mx * sinT + mz * cosT;

  if (Math.hypot(wx, wz) > 1e-6) {
    sim.player.pos[0] += wx * sim.tuning.player_speed * SIM_DT;
    sim.player.pos[2] += wz * sim.tuning.player_speed * SIM_DT;
    clampToIsland(sim.player.pos);
    sim.player.facingYawDeg = (Math.atan2(wx, wz) * 180) / Math.PI;
  }

  // 2. Vertical jump and gravity
  if (jumpTriggered && sim.player.grounded) {
    sim.player.vy = JUMP_VELOCITY;
    sim.player.grounded = false;
  }
  sim.player.vy -= GRAVITY * SIM_DT;
  sim.player.pos[1] += sim.player.vy * SIM_DT;
  if (sim.player.pos[1] <= 0) {
    sim.player.pos[1] = 0;
    sim.player.vy = 0;
    sim.player.grounded = true;
  }

  // 3. Automatic mote pickup within pickup_radius
  for (const mote of sim.motes) {
    if (!mote.active) continue;
    if (sim.player.carried >= sim.tuning.carry_capacity) break;
    if (distXZ(sim.player.pos, mote.pos) <= sim.tuning.pickup_radius) {
      mote.active = false;
      sim.player.carried += 1;
      sim.score += sim.tuning.score.per_mote;
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'mote_picked',
        data: { carried: sim.player.carried }
      });
    }
  }

  // 4. Deposit light into nearest unlit lantern on interact rising edge
  if (interactTriggered && sim.player.carried > 0) {
    const target = findNearestInteractableLantern(sim);
    if (target) {
      const needed = Math.max(0, sim.tuning.lantern_cost - target.deposited);
      const amount = Math.min(sim.player.carried, needed);
      if (amount > 0) {
        sim.player.carried -= amount;
        target.deposited += amount;
        events.push({
          type: 'event',
          tick: nextTick,
          name: 'deposit',
          data: {
            lantern_id: target.id,
            amount,
            deposited: target.deposited
          }
        });
        if (target.deposited >= sim.tuning.lantern_cost) {
          target.lit = true;
          sim.score += sim.tuning.score.per_lantern;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'lantern_lit',
            data: { lantern_id: target.id }
          });
        }
      }
    }
  }

  // 4b. Light pulse (Q): stun & push nearby shades
  if (
    pulseTriggered &&
    sim.player.carried >= sim.tuning.pulse_cost &&
    sim.player.pulseCooldown <= 0
  ) {
    sim.player.carried -= sim.tuning.pulse_cost;
    sim.player.pulseCooldown = sim.tuning.pulse_cooldown_s;
    const stunnedIds = [];
    for (const shade of sim.shades) {
      const dx = shade.pos[0] - sim.player.pos[0];
      const dz = shade.pos[2] - sim.player.pos[2];
      const d = Math.hypot(dx, dz);
      if (d <= sim.tuning.pulse_radius) {
        shade.stunTimer = sim.tuning.pulse_stun_s;
        shade.state = 'stunned';
        const nx = d > 1e-6 ? dx / d : 0;
        const nz = d > 1e-6 ? dz / d : 1;
        shade.pos[0] += nx * sim.tuning.pulse_push_m;
        shade.pos[2] += nz * sim.tuning.pulse_push_m;
        clampToIsland(shade.pos);
        stunnedIds.push(shade.id);
        sim.score += sim.tuning.score.per_stun;
      }
    }
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'pulse',
      data: { stunned_ids: stunnedIds }
    });
  }

  // 4c. Periodic shade spawning (every 30s = 1800 ticks, max 5)
  if (sim.randomShades && nextTick % 1800 === 0 && sim.shades.length < 5) {
    const angle = sim.rng() * Math.PI * 2;
    const radius = 26 + sim.rng() * 6;
    const id = `S${sim.nextShadeIndex++}`;
    const pos = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
    for (const lantern of sim.lanterns) {
      if (!lantern.lit) continue;
      const dx = pos[0] - lantern.pos[0];
      const dz = pos[2] - lantern.pos[2];
      const d = Math.hypot(dx, dz);
      if (d < sim.tuning.safe_radius) {
        const nx = d > 1e-6 ? dx / d : 0;
        const nz = d > 1e-6 ? dz / d : 1;
        pos[0] = lantern.pos[0] + nx * sim.tuning.safe_radius;
        pos[2] = lantern.pos[2] + nz * sim.tuning.safe_radius;
      }
    }
    clampToIsland(pos);
    sim.shades.push({ id, pos, state: 'chase', stunTimer: 0 });
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'shade_spawned',
      data: { id }
    });
  }

  // 4d. Update shades (stun timer, chase player, avoid lit lantern safe_radius)
  for (const shade of sim.shades) {
    if (shade.stunTimer > 0) {
      shade.stunTimer = Math.max(0, shade.stunTimer - SIM_DT);
      shade.state = shade.stunTimer > 0 ? 'stunned' : 'chase';
    } else {
      shade.state = 'chase';
      const dx = sim.player.pos[0] - shade.pos[0];
      const dz = sim.player.pos[2] - shade.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = Math.min(d, sim.tuning.shade_speed * SIM_DT);
        shade.pos[0] += (dx / d) * step;
        shade.pos[2] += (dz / d) * step;
      }
    }

    for (const lantern of sim.lanterns) {
      if (!lantern.lit) continue;
      const dx = shade.pos[0] - lantern.pos[0];
      const dz = shade.pos[2] - lantern.pos[2];
      const d = Math.hypot(dx, dz);
      if (d < sim.tuning.safe_radius) {
        const nx = d > 1e-6 ? dx / d : 0;
        const nz = d > 1e-6 ? dz / d : 1;
        shade.pos[0] = lantern.pos[0] + nx * sim.tuning.safe_radius;
        shade.pos[2] = lantern.pos[2] + nz * sim.tuning.safe_radius;
      }
    }
    clampToIsland(shade.pos);
  }

  // 4e. Player-shade collision
  if (sim.player.invulnTimer <= 0) {
    for (const shade of sim.shades) {
      if (shade.state === 'stunned') continue;
      if (distXZ(sim.player.pos, shade.pos) <= sim.tuning.shade_hit_radius) {
        sim.player.flames = Math.max(0, sim.player.flames - 1);
        sim.player.invulnTimer = sim.tuning.invuln_s;
        const dropped = Math.floor(sim.player.carried * sim.tuning.hit_drop_ratio);
        sim.player.carried -= dropped;
        events.push({
          type: 'event',
          tick: nextTick,
          name: 'player_hit',
          data: { by: 'shade', flames: sim.player.flames, dropped }
        });
        break;
      }
    }
  }

  // 5. Advance clock and check end conditions (priority: all_lit > no_flames > dawn)
  sim.tick = nextTick;
  sim.simTick = nextTick;
  sim.timeLeftS = Math.max(0, sim.initialTimeLeftS - nextTick * SIM_DT);

  const allLit = sim.lanterns.every((l) => l.lit);
  if (allLit) {
    sim.state = 'won';
    sim.endReason = 'all_lit';
    sim.score +=
      Math.floor(sim.timeLeftS) * sim.tuning.score.per_second_left +
      sim.player.flames * sim.tuning.score.per_flame_left;
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'game_over',
      data: { result: 'won', reason: 'all_lit' }
    });
  } else if (sim.player.flames <= 0) {
    sim.state = 'lost';
    sim.endReason = 'no_flames';
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'game_over',
      data: { result: 'lost', reason: 'no_flames' }
    });
  } else if (sim.timeLeftS <= 0) {
    sim.state = 'lost';
    sim.endReason = 'dawn';
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'game_over',
      data: { result: 'lost', reason: 'dawn' }
    });
  }

  sim.prevInput = input;
  return events;
}
