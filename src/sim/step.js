import { SIM_DT, TICK_RATE, dist3D, distXZ, round3 } from './math.js';
import { getGroundHeight, resolveHorizontalObstacles } from './maps.js';

const JUMP_VELOCITY = 7.0;
const GRAVITY = 20.0;
const WIND_PUSH_SPEED = 2.0;

function isOutsideAll(x, z, litLanterns, safeRadius) {
  for (const l of litLanterns) {
    if (Math.hypot(x - l.pos[0], z - l.pos[2]) < safeRadius - 1e-6) {
      return false;
    }
  }
  return true;
}

function pushOutsideSafeZones(pos, lanterns, safeRadius, maxStep = Infinity) {
  const litLanterns = lanterns.filter((l) => l.lit);
  if (litLanterns.length === 0) return;
  if (isOutsideAll(pos[0], pos[2], litLanterns, safeRadius)) return;

  const candidates = [];

  for (const l of litLanterns) {
    const dx = pos[0] - l.pos[0];
    const dz = pos[2] - l.pos[2];
    const d = Math.hypot(dx, dz);
    const nx = d > 1e-6 ? dx / d : 0;
    const nz = d > 1e-6 ? dz / d : 1;
    const cx = l.pos[0] + nx * safeRadius;
    const cz = l.pos[2] + nz * safeRadius;
    if (isOutsideAll(cx, cz, litLanterns, safeRadius)) {
      candidates.push([cx, cz]);
    }
  }

  for (let i = 0; i < litLanterns.length; i += 1) {
    for (let j = i + 1; j < litLanterns.length; j += 1) {
      const a = litLanterns[i].pos;
      const b = litLanterns[j].pos;
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const d = Math.hypot(dx, dz);
      if (d <= 1e-6 || d >= 2 * safeRadius) continue;

      const midX = (a[0] + b[0]) * 0.5;
      const midZ = (a[2] + b[2]) * 0.5;
      const h = Math.sqrt(Math.max(0, safeRadius * safeRadius - (d * 0.5) * (d * 0.5)));
      const px = (-dz / d) * h;
      const pz = (dx / d) * h;
      for (const sign of [1, -1]) {
        const ix = midX + sign * px;
        const iz = midZ + sign * pz;
        if (isOutsideAll(ix, iz, litLanterns, safeRadius)) {
          candidates.push([ix, iz]);
        }
      }
    }
  }

  if (candidates.length > 0) {
    let best = candidates[0];
    let bestDist = Math.hypot(best[0] - pos[0], best[1] - pos[2]);
    for (let i = 1; i < candidates.length; i += 1) {
      const d = Math.hypot(candidates[i][0] - pos[0], candidates[i][1] - pos[2]);
      if (d < bestDist) {
        best = candidates[i];
        bestDist = d;
      }
    }
    if (bestDist > maxStep && bestDist > 1e-6) {
      const ratio = maxStep / bestDist;
      pos[0] += (best[0] - pos[0]) * ratio;
      pos[2] += (best[1] - pos[2]) * ratio;
    } else {
      pos[0] = best[0];
      pos[2] = best[1];
    }
  }
}

function isPlayerInSafeZone(sim) {
  return sim.lanterns.some(
    (l) => l.lit && distXZ(sim.player.pos, l.pos) <= sim.tuning.safe_radius
  );
}

/**
 * Find the nearest unlit lantern within interact_radius.
 * Ties are broken deterministically by ascending lantern ID.
 */
export function findNearestInteractableLantern(sim) {
  let best = null;
  let bestDist = Infinity;
  for (const lantern of sim.lanterns) {
    if (lantern.lit) continue;
    const d = dist3D(sim.player.pos, lantern.pos);
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

function nextFreeId(existingSet, prefix, startIdx) {
  let idx = startIdx;
  while (existingSet.has(`${prefix}${idx}`)) {
    idx += 1;
  }
  return { id: `${prefix}${idx}`, nextIdx: idx + 1 };
}

function spawnDroppedMotes(sim, centerPos, count, rng, inRing = true) {
  const existingIds = new Set(sim.motes.map((m) => m.id));
  for (let i = 0; i < count; i += 1) {
    const { id, nextIdx } = nextFreeId(existingIds, 'M', sim.nextMoteIndex);
    sim.nextMoteIndex = nextIdx;
    existingIds.add(id);
    let x = centerPos[0];
    let z = centerPos[2];
    if (inRing) {
      const angle = rng() * Math.PI * 2;
      const radius = 1.5 + rng() * 1.0;
      x += Math.cos(angle) * radius;
      z += Math.sin(angle) * radius;
    }
    const gy = getGroundHeight(sim.night, x, z, centerPos[1] + 0.5);
    const y = gy !== null ? gy : centerPos[1];
    sim.motes.push({
      id,
      pos: [round3(x), round3(y), round3(z)],
      active: true,
      kind: 'dropped',
      ttlTicks: 480,
      spawnedThisTick: true
    });
  }
}

/**
 * Advance simulation by one fixed 1/60s tick using the supplied input patch.
 * Follows the exact 12-step per-tick order of Test Contract v1.1.
 */
export function stepSimulation(sim, framePatch = null) {
  if (sim.state === 'won' || sim.state === 'lost') {
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
    dash: framePatch?.dash !== undefined ? framePatch.dash : prev.dash,
    pause: framePatch?.pause !== undefined ? framePatch.pause : prev.pause
  };

  const nextTick = sim.tick + 1;
  const events = [];

  // 1. Read input & handle pause rising edge first
  const pauseTriggered = input.pause && !prev.pause;
  if (pauseTriggered) {
    if (sim.state === 'playing') {
      sim.state = 'paused';
      sim.tick = nextTick;
      sim.prevInput = input;
      events.push({ type: 'event', tick: nextTick, name: 'paused', data: {} });
      return events;
    }
    if (sim.state === 'paused') {
      sim.state = 'playing';
      events.push({ type: 'event', tick: nextTick, name: 'resumed', data: {} });
    }
  } else if (sim.state === 'paused') {
    sim.tick = nextTick;
    sim.prevInput = input;
    return events;
  }

  const nextSimTick = sim.simTick + 1;
  const jumpTriggered = input.jump && !prev.jump;
  const interactTriggered = input.interact && !prev.interact;
  const pulseTriggered = input.pulse && !prev.pulse;
  const dashTriggered = input.dash && !prev.dash;

  // 2. Decrement counters & clear spawnedThisTick flags
  for (const m of sim.motes) {
    m.spawnedThisTick = false;
    if (m.active && m.kind === 'dropped' && m.ttlTicks !== null) {
      m.ttlTicks -= 1;
      if (m.ttlTicks <= 0) m.active = false;
    }
  }
  for (const s of sim.shades) {
    s.spawnedThisTick = false;
    if (s.safePushTicksLeft > 0) s.safePushTicksLeft -= 1;
    if (s.stateTicksLeft > 0) {
      s.stateTicksLeft -= 1;
    }
  }
  for (const d of sim.drifters) {
    d.spawnedThisTick = false;
  }
  for (const c of sim.charms) {
    if (!c.available && c.respawnTicks > 0) {
      c.respawnTicks -= 1;
      if (c.respawnTicks === 0) c.available = true;
    }
  }

  sim.timeLeftTicks = Math.max(0, sim.timeLeftTicks - 1);
  sim.timeLeftS = sim.timeLeftTicks * SIM_DT;

  const p = sim.player;
  p.invulnTicks = Math.max(0, p.invulnTicks - 1);
  p.dashCdTicks = Math.max(0, p.dashCdTicks - 1);
  p.pulseCdTicks = Math.max(0, p.pulseCdTicks - 1);
  p.charmTicks = Math.max(0, p.charmTicks - 1);

  if (p.respawnTicks > 0) {
    p.respawnTicks -= 1;
    if (p.respawnTicks === 0) {
      p.pos = [...sim.map.spawn];
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.launched = false;
      p.invulnTicks = Math.round(sim.tuning.invuln_s * TICK_RATE);
    }
  }

  // Wind update (Night 3)
  if (sim.windEnabled) {
    const cycleTick = nextSimTick % 1800;
    if (cycleTick === 1680) {
      const deg = round3(sim.rng() * 360);
      const rad = (deg * Math.PI) / 180;
      sim.wind.dirDeg = deg;
      sim.wind.dirVec = [Math.cos(rad), Math.sin(rad)];
      sim.wind.warning = true;
      sim.wind.active = false;
    } else if (nextSimTick > 0 && cycleTick === 0) {
      sim.wind.warning = false;
      sim.wind.active = true;
      sim.wind.ticksLeft = 300;
    } else if (sim.wind.active) {
      sim.wind.ticksLeft -= 1;
      if (sim.wind.ticksLeft <= 0) {
        sim.wind.active = false;
      }
    }
  }

  // 3. Move player (jump, dash, launch pad, wind) & check fall
  if (p.respawnTicks === 0) {
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
    const wMag = Math.hypot(wx, wz);

    // Dash rising edge
    if (dashTriggered && p.dashTicks === 0 && (p.dashCdTicks === 0 || p.charmTicks > 0)) {
      let dx = 0;
      let dz = 1;
      if (wMag > 1e-6) {
        dx = wx / wMag;
        dz = wz / wMag;
        p.facingYawDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
      } else {
        const fRad = (p.facingYawDeg * Math.PI) / 180;
        dx = Math.sin(fRad);
        dz = Math.cos(fRad);
      }
      p.dashTicks = Math.round(sim.tuning.dash_duration_s * TICK_RATE);
      p.dashDir = [dx, dz];
      if (p.charmTicks === 0) {
        p.dashCdTicks = Math.round(sim.tuning.dash_cooldown_s * TICK_RATE);
      }
      events.push({ type: 'event', tick: nextTick, name: 'dash', data: {} });
    }

    let vx = p.vel[0];
    let vz = p.vel[2];
    const isDashingThisTick = p.dashTicks > 0;

    if (isDashingThisTick) {
      vx = p.dashDir[0] * sim.tuning.dash_speed;
      vz = p.dashDir[1] * sim.tuning.dash_speed;
      p.dashTicks -= 1;
      p.vel[1] = 0;
    } else if (p.launched) {
      vx = p.launchVel[0];
      vz = p.launchVel[1];
    } else {
      const maxSpeed = p.charmTicks > 0 ? 7.2 : sim.tuning.player_speed;
      const tvx = wx * maxSpeed;
      const tvz = wz * maxSpeed;
      const maxDv = maxSpeed / 6;
      const dvx = tvx - vx;
      const dvz = tvz - vz;
      const dvMag = Math.hypot(dvx, dvz);
      if (dvMag <= maxDv) {
        vx = tvx;
        vz = tvz;
      } else {
        vx += (dvx / dvMag) * maxDv;
        vz += (dvz / dvMag) * maxDv;
      }
      if (wMag > 1e-6) {
        p.facingYawDeg = (Math.atan2(wx, wz) * 180) / Math.PI;
      }
    }

    if (!isDashingThisTick && !p.launched && jumpTriggered && p.grounded) {
      p.vel[1] = JUMP_VELOCITY;
      p.grounded = false;
    }

    if (!isDashingThisTick) {
      p.vel[1] -= GRAVITY * SIM_DT;
      p.pos[1] += p.vel[1] * SIM_DT;
    }

    const windVx = sim.wind.active ? sim.wind.dirVec[0] * WIND_PUSH_SPEED : 0;
    const windVz = sim.wind.active ? sim.wind.dirVec[1] * WIND_PUSH_SPEED : 0;

    const prevX = p.pos[0];
    const prevZ = p.pos[2];
    p.pos[0] += (vx + windVx) * SIM_DT;
    p.pos[2] += (vz + windVz) * SIM_DT;
    p.vel[0] = vx;
    p.vel[2] = vz;

    resolveHorizontalObstacles(sim.night, p.pos, prevX, prevZ);

    const gy = getGroundHeight(sim.night, p.pos[0], p.pos[2], p.pos[1]);
    if (gy !== null && p.pos[1] <= gy && p.vel[1] <= 0) {
      p.pos[1] = gy;
      p.vel[1] = 0;
      p.grounded = true;
      p.launched = false;
    } else if (gy === null || p.pos[1] > gy + 1e-4) {
      p.grounded = false;
    }

    // Launch pads
    if (p.dashTicks === 0 && !p.launched && sim.map.launchPads.length > 0) {
      for (const pad of sim.map.launchPads) {
        if (
          distXZ(p.pos, pad.pos) <= pad.radius &&
          Math.abs(p.pos[1] - pad.pos[1]) <= 0.6
        ) {
          let dirX;
          let dirZ;
          if (pad.dir) {
            dirX = pad.dir[0];
            dirZ = pad.dir[1];
          } else {
            const dx = pad.target[0] - pad.pos[0];
            const dz = pad.target[2] - pad.pos[2];
            const d = Math.hypot(dx, dz) || 1;
            dirX = dx / d;
            dirZ = dz / d;
          }
          p.vel[1] = pad.vy;
          p.launchVel = [dirX * pad.hSpeed, dirZ * pad.hSpeed];
          p.vel[0] = p.launchVel[0];
          p.vel[2] = p.launchVel[1];
          p.grounded = false;
          p.launched = true;
          break;
        }
      }
    }

    // Fall off island check (Y < -10)
    if (sim.tuning.fall_enabled && p.pos[1] < -10) {
      p.flames = Math.max(0, p.flames - 1);
      const lost = p.carried;
      p.carried = 0;
      p.dashTicks = 0;
      p.launched = false;
      p.vel = [0, 0, 0];
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'player_hit',
        data: { by: 'fall', flames: p.flames, dropped: 0, lost }
      });
      if (p.flames > 0) {
        p.respawnTicks = 60;
      }
    }
  }

  // 4. Pickup motes & charms (skip while waiting to respawn)
  if (p.respawnTicks === 0) {
    for (const mote of sim.motes) {
      if (!mote.active || mote.spawnedThisTick) continue;
      if (p.carried >= sim.tuning.carry_capacity) break;
      if (
        distXZ(p.pos, mote.pos) <= sim.tuning.pickup_radius &&
        Math.abs(p.pos[1] - mote.pos[1]) <= 1.5
      ) {
        mote.active = false;
        p.carried += 1;
        events.push({
          type: 'event',
          tick: nextTick,
          name: 'mote_picked',
          data: { carried: p.carried }
        });
      }
    }

    for (const charm of sim.charms) {
      if (!charm.available) continue;
      if (
        distXZ(p.pos, charm.pos) <= sim.tuning.pickup_radius &&
        Math.abs(p.pos[1] - charm.pos[1]) <= 1.5
      ) {
        charm.available = false;
        charm.respawnTicks = 2700;
        p.charmTicks = 600;
        events.push({
          type: 'event',
          tick: nextTick,
          name: 'charm_picked',
          data: { charm_id: charm.id, charm_ticks: 600 }
        });
      }
    }

    // 5. Interact with lantern
    if (interactTriggered && p.carried > 0) {
      const target = findNearestInteractableLantern(sim);
      if (target) {
        const needed = Math.max(0, sim.tuning.lantern_cost - target.deposited);
        const amount = Math.min(p.carried, needed);
        if (amount > 0) {
          p.carried -= amount;
          target.deposited += amount;
          sim.score += amount * sim.tuning.score.per_deposit;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'deposit',
            data: { lantern_id: target.id, amount, deposited: target.deposited }
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
            for (const shade of sim.shades) {
              if (distXZ(shade.pos, target.pos) < sim.tuning.safe_radius) {
                shade.safePushTicksLeft = 30;
              }
            }
          }
        }
      }
    }
  }

  // 6. Update safe zones
  for (const shade of sim.shades) {
    if (shade.safePushTicksLeft > 0) {
      const maxStep = 6.0 / Math.max(1, shade.safePushTicksLeft);
      pushOutsideSafeZones(shade.pos, sim.lanterns, sim.tuning.safe_radius, maxStep);
    } else {
      pushOutsideSafeZones(shade.pos, sim.lanterns, sim.tuning.safe_radius);
    }
  }

  // 7. Pulse (Tỏa Sáng)
  if (
    p.respawnTicks === 0 &&
    pulseTriggered &&
    p.carried >= sim.tuning.pulse_cost &&
    p.pulseCdTicks === 0
  ) {
    p.carried -= sim.tuning.pulse_cost;
    p.pulseCdTicks = Math.round(sim.tuning.pulse_cooldown_s * TICK_RATE);
    const pulseCenter = [p.pos[0], p.pos[1] + 0.8, p.pos[2]];
    const stunnedIds = [];

    for (const shade of sim.shades) {
      if (dist3D(pulseCenter, shade.pos) <= sim.tuning.pulse_radius) {
        shade.state = 'stunned';
        shade.stateTicksLeft = Math.round(sim.tuning.pulse_stun_s * TICK_RATE);
        shade.pushTicksLeft = 15;
        const dx = shade.pos[0] - p.pos[0];
        const dz = shade.pos[2] - p.pos[2];
        const d = Math.hypot(dx, dz);
        shade.pushDir = d > 1e-6 ? [dx / d, dz / d] : [1, 0];
        stunnedIds.push(shade.id);
        sim.score += sim.tuning.score.per_stun;
      }
    }

    for (const drifter of sim.drifters) {
      if (drifter.state === 'removed') continue;
      if (dist3D(pulseCenter, drifter.pos) <= sim.tuning.pulse_radius) {
        if (drifter.state === 'chase') {
          drifter.state = 'flee';
          drifter.stateTicksLeft = 120;
        } else if (drifter.state === 'flee' && drifter.stolen > 0) {
          const amount = drifter.stolen;
          spawnDroppedMotes(sim, drifter.pos, amount, sim.rng, false);
          drifter.stolen = 0;
          drifter.stateTicksLeft = 120;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'drifter_drop',
            data: { drifter_id: drifter.id, amount }
          });
        }
      }
    }

    events.push({
      type: 'event',
      tick: nextTick,
      name: 'pulse',
      data: { stunned_ids: stunnedIds }
    });
  }

  // 8. Move shades & drifters
  const shadeSpeed = sim.map.shadeSpeed;
  for (const shade of sim.shades) {
    const prevSX = shade.pos[0];
    const prevSZ = shade.pos[2];

    if (shade.pushTicksLeft > 0) {
      const pushStep = sim.tuning.pulse_push_m / 15;
      shade.pos[0] += shade.pushDir[0] * pushStep;
      shade.pos[2] += shade.pushDir[1] * pushStep;
      shade.pushTicksLeft -= 1;
      resolveHorizontalObstacles(sim.night, shade.pos, prevSX, prevSZ);
    }

    if (shade.state === 'recoil') {
      const dx = shade.pos[0] - p.pos[0];
      const dz = shade.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      const step = 2.0 / 60;
      shade.pos[0] += nx * step;
      shade.pos[2] += nz * step;
    } else if (shade.state === 'chase') {
      const d = distXZ(p.pos, shade.pos);
      if (p.respawnTicks > 0 || d > 18) {
        shade.state = 'wander';
      } else if (d > 1e-6) {
        const step = Math.min(d, shadeSpeed * SIM_DT);
        shade.pos[0] += ((p.pos[0] - shade.pos[0]) / d) * step;
        shade.pos[2] += ((p.pos[2] - shade.pos[2]) / d) * step;
      }
    } else if (shade.state === 'wander') {
      const d = distXZ(p.pos, shade.pos);
      if (p.respawnTicks === 0 && d <= 12) {
        shade.state = 'chase';
      } else {
        const wanderStep = shadeSpeed * 0.4 * SIM_DT;
        shade.pos[0] += Math.cos(shade.wanderAngle) * wanderStep;
        shade.pos[2] += Math.sin(shade.wanderAngle) * wanderStep;
        if (nextSimTick % 120 === 0) {
          shade.wanderAngle += (sim.rng() - 0.5) * 1.5;
        }
      }
    }

    resolveHorizontalObstacles(sim.night, shade.pos, prevSX, prevSZ);
    if (shade.safePushTicksLeft === 0) {
      pushOutsideSafeZones(shade.pos, sim.lanterns, sim.tuning.safe_radius);
    }
    const sGy = getGroundHeight(sim.night, shade.pos[0], shade.pos[2], shade.pos[1] + 0.5);
    if (sGy !== null) {
      shade.pos[1] = sGy;
    } else {
      shade.pos[0] = prevSX;
      shade.pos[2] = prevSZ;
    }

    if (
      shade.stateTicksLeft === 0 &&
      (shade.state === 'spawning' || shade.state === 'recoil' || shade.state === 'stunned')
    ) {
      const d = distXZ(shade.pos, p.pos);
      shade.state = d <= 12 ? 'chase' : 'wander';
    }
  }

  for (const drifter of sim.drifters) {
    if (drifter.state === 'removed') continue;
    if (drifter.state === 'flee') {
      const dx = drifter.pos[0] - p.pos[0];
      const dz = drifter.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      drifter.pos[0] += nx * 7.0 * SIM_DT;
      drifter.pos[2] += nz * 7.0 * SIM_DT;
      drifter.stateTicksLeft -= 1;
      if (drifter.stateTicksLeft <= 0) {
        drifter.state = 'removed';
      }
    } else {
      const d = distXZ(drifter.pos, p.pos);
      if (p.respawnTicks === 0 && p.carried >= 5 && d <= 15) {
        drifter.state = 'chase';
        if (d > 1e-6) {
          const step = Math.min(d, 7.0 * SIM_DT);
          drifter.pos[0] += ((p.pos[0] - drifter.pos[0]) / d) * step;
          drifter.pos[2] += ((p.pos[2] - drifter.pos[2]) / d) * step;
        }
      } else {
        drifter.state = 'idle';
        drifter.pos[0] += Math.cos(drifter.wanderAngle) * 2.0 * SIM_DT;
        drifter.pos[2] += Math.sin(drifter.wanderAngle) * 2.0 * SIM_DT;
        if (nextSimTick % 90 === 0) {
          drifter.wanderAngle += (sim.rng() - 0.5) * 1.4;
        }
      }
    }
  }

  // 9. Collisions: Drifter steal first, then Shade hit by ascending ID
  if (p.respawnTicks === 0) {
    const sortedDrifters = [...sim.drifters].sort((a, b) => a.id.localeCompare(b.id));
    for (const drifter of sortedDrifters) {
      if (
        drifter.spawnedThisTick ||
        drifter.hasStolen ||
        drifter.state === 'flee' ||
        drifter.state === 'removed'
      ) {
        continue;
      }
      if (distXZ(p.pos, drifter.pos) <= 1.2) {
        const amount = Math.min(3, p.carried);
        if (amount > 0) {
          p.carried -= amount;
          drifter.stolen += amount;
          drifter.hasStolen = true;
          drifter.state = 'flee';
          drifter.stateTicksLeft = 240;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'drifter_steal',
            data: { drifter_id: drifter.id, amount, carried: p.carried }
          });
        }
      }
    }

    if (p.invulnTicks === 0 && !isPlayerInSafeZone(sim)) {
      const sortedShades = [...sim.shades].sort((a, b) => a.id.localeCompare(b.id));
      for (const shade of sortedShades) {
        if (
          shade.spawnedThisTick ||
          shade.safePushTicksLeft > 0 ||
          shade.state === 'stunned' ||
          shade.state === 'recoil' ||
          shade.state === 'spawning'
        ) {
          continue;
        }
        if (
          distXZ(p.pos, shade.pos) <= sim.tuning.shade_hit_radius &&
          Math.abs(p.pos[1] - shade.pos[1]) <= 1.5
        ) {
          p.flames = Math.max(0, p.flames - 1);
          p.invulnTicks = Math.round(sim.tuning.invuln_s * TICK_RATE);
          const dropped = Math.floor(p.carried / 2);
          p.carried -= dropped;
          if (dropped > 0) {
            spawnDroppedMotes(sim, p.pos, dropped, sim.rng, true);
          }
          shade.state = 'recoil';
          shade.stateTicksLeft = 60;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'player_hit',
            data: { by: 'shade', flames: p.flames, dropped }
          });
          break;
        }
      }
    }
  }

  // 10. Scheduled spawns (using sim_tick; spawned entities interact starting next tick)
  if (sim.randomMotes && nextSimTick % 240 === 0) {
    const activeCount = sim.motes.reduce((acc, m) => acc + (m.active ? 1 : 0), 0);
    if (activeCount < 30) {
      const emptySpawns = sim.map.moteSpawns.filter(
        (sp) => !sim.motes.some((m) => m.active && dist3D(m.pos, sp) <= 0.5)
      );
      if (emptySpawns.length > 0) {
        const chosen = emptySpawns[Math.floor(sim.rng() * emptySpawns.length)];
        const existingIds = new Set(sim.motes.map((m) => m.id));
        const { id, nextIdx } = nextFreeId(existingIds, 'M', sim.nextMoteIndex);
        sim.nextMoteIndex = nextIdx;
        sim.motes.push({
          id,
          pos: [...chosen],
          active: true,
          kind: 'random',
          ttlTicks: null,
          spawnedThisTick: true
        });
      }
    }
  }

  if (sim.randomShades) {
    const isInitialWave = nextSimTick === 300;
    const isPeriodicWave =
      nextSimTick > 300 && (nextSimTick - 300) % sim.map.shadeSpawnInterval === 0;
    const spawnCount = isInitialWave ? 2 : isPeriodicWave ? 1 : 0;

    for (let i = 0; i < spawnCount; i += 1) {
      if (sim.shades.length >= sim.map.maxShades) break;
      const validSpawns = sim.map.shadeSpawns.filter(
        (sp) =>
          distXZ(sp, p.pos) >= 15 &&
          sim.lanterns.every((l) => !l.lit || distXZ(sp, l.pos) >= sim.tuning.safe_radius)
      );
      if (validSpawns.length === 0) break;
      const chosen = validSpawns[Math.floor(sim.rng() * validSpawns.length)];
      const existingIds = new Set(sim.shades.map((s) => s.id));
      const { id, nextIdx } = nextFreeId(existingIds, 'S', sim.nextShadeIndex);
      sim.nextShadeIndex = nextIdx;
      const state = distXZ(chosen, p.pos) <= 12 ? 'chase' : 'wander';
      sim.shades.push({
        id,
        pos: [...chosen],
        state,
        stateTicksLeft: 0,
        pushTicksLeft: 0,
        pushDir: [1, 0],
        safePushTicksLeft: 0,
        wanderAngle: sim.rng() * Math.PI * 2,
        spawnedThisTick: true
      });
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'shade_spawned',
        data: { id }
      });
    }
  }

  if (sim.randomDrifters && nextSimTick > 0 && nextSimTick % 1200 === 0) {
    const activeDrifters = sim.drifters.filter((d) => d.state !== 'removed').length;
    if (activeDrifters < 2 && sim.map.shadeSpawns.length > 0) {
      const chosen = sim.map.shadeSpawns[Math.floor(sim.rng() * sim.map.shadeSpawns.length)];
      const existingIds = new Set(sim.drifters.map((d) => d.id));
      const { id, nextIdx } = nextFreeId(existingIds, 'D', sim.nextDrifterIndex);
      sim.nextDrifterIndex = nextIdx;
      sim.drifters.push({
        id,
        pos: [...chosen],
        state: 'idle',
        stolen: 0,
        hasStolen: false,
        stateTicksLeft: 0,
        wanderAngle: sim.rng() * Math.PI * 2,
        spawnedThisTick: true
      });
    }
  }

  // 11. Advance tick & check end conditions (priority: no_flames > all_lit > dawn)
  sim.tick = nextTick;
  sim.simTick = nextSimTick;

  const allLit = sim.lanterns.every((l) => l.lit);
  if (p.flames <= 0) {
    sim.state = 'lost';
    sim.endReason = 'no_flames';
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'game_over',
      data: { result: 'lost', reason: 'no_flames' }
    });
  } else if (allLit) {
    sim.state = 'won';
    sim.endReason = 'all_lit';
    sim.score +=
      Math.floor(sim.timeLeftS) * sim.tuning.score.per_second_left +
      p.flames * sim.tuning.score.per_flame_left;
    events.push({
      type: 'event',
      tick: nextTick,
      name: 'game_over',
      data: { result: 'won', reason: 'all_lit' }
    });
  } else if (sim.timeLeftTicks <= 0) {
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
