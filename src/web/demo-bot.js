import { dist3D, distXZ, findNearestInteractableLantern } from '../sim/index.js';

/**
 * Compute one tick of human-like AI gameplay input for the in-browser Demo mode.
 * Navigates motes, lanterns, bridges/ramps, dashes away from danger, and pulses Shades.
 */
export function createDemoBot() {
  let prevInteract = false;
  let prevPulse = false;
  let prevDash = false;
  let prevJump = false;
  let smoothYawDeg = 0;

  function pickWaypoint(sim, rawTarget) {
    const px = sim.player.pos[0];
    const py = sim.player.pos[1];
    const pz = sim.player.pos[2];

    if (sim.night === 2) {
      const playerOnB = px > 35;
      const targetOnB = rawTarget[0] > 35;
      if (playerOnB !== targetOnB && (px < 26 || px > 44 || Math.abs(pz) > 1.5)) {
        // Route across the bamboo bridge [26..44, z=0]
        return playerOnB ? [43, 0, 0] : [27, 0, 0];
      }
    }

    if (sim.night === 3) {
      const ty = rawTarget[1];
      if (py < 2.5 && ty >= 2.5) {
        // Route up the 30-deg ramp (r=30 -> r=24)
        const rad30 = (30 * Math.PI) / 180;
        const r = Math.hypot(px, pz);
        if (r > 29.5 || pz < 0) {
          return [Math.cos(rad30) * 31, 0, Math.sin(rad30) * 31];
        }
        return [Math.cos(rad30) * 23, 3, Math.sin(rad30) * 23];
      }
      if (py >= 2.5 && py < 5.5 && ty >= 5.5) {
        // Use launch pad at (0, 3, 13) to reach Tier 2
        return [0, 3, 13];
      }
    }

    return rawTarget;
  }

  function step(sim, dt = 1 / 60) {
    const p = sim.player;
    let interact = false;
    let pulse = false;
    let dash = false;
    let jump = false;

    // 1. Pulse if Shade or chasing Drifter is within 4.4m and ready
    const nearbyEnemy =
      sim.shades.some((s) => s.state !== 'stunned' && dist3D(p.pos, s.pos) <= 4.4) ||
      sim.drifters.some((d) => d.state === 'chase' && dist3D(p.pos, d.pos) <= 4.4);
    if (nearbyEnemy && p.carried >= sim.tuning.pulse_cost && p.pulseCdTicks === 0 && !prevPulse) {
      pulse = true;
    }

    // 2. Interact if near a lantern that can receive motes
    const nearLantern = findNearestInteractableLantern(sim);
    if (nearLantern && p.carried > 0 && !prevInteract) {
      interact = true;
    }

    // 3. Choose target: lantern if carrying enough or fuel < 45, else nearest mote
    const needLanterns = sim.lanterns.filter(
      (l) => !l.lit || l.fuelUnits < 45 * 60
    );
    let targetPos = null;
    if (p.carried >= 5 && needLanterns.length > 0) {
      needLanterns.sort((a, b) => dist3D(p.pos, a.pos) - dist3D(p.pos, b.pos));
      targetPos = needLanterns[0].pos;
    } else {
      const activeMotes = sim.motes.filter((m) => m.active);
      if (activeMotes.length > 0) {
        activeMotes.sort((a, b) => dist3D(p.pos, a.pos) - dist3D(p.pos, b.pos));
        targetPos = activeMotes[0].pos;
      } else if (needLanterns.length > 0 && p.carried > 0) {
        needLanterns.sort((a, b) => dist3D(p.pos, a.pos) - dist3D(p.pos, b.pos));
        targetPos = needLanterns[0].pos;
      }
    }

    let vx = 0;
    let vz = 0;
    if (targetPos) {
      const wp = pickWaypoint(sim, targetPos);
      const dx = wp[0] - p.pos[0];
      const dz = wp[2] - p.pos[2];
      const d = Math.hypot(dx, dz) || 1;
      vx = dx / d;
      vz = dz / d;
    }

    // 4. Evade very close Shades & dash when safe to do so
    for (const s of sim.shades) {
      if (s.state === 'stunned' || s.state === 'recoil') continue;
      const d = distXZ(p.pos, s.pos);
      if (d < 4.5 && d > 0.01) {
        const awayX = (p.pos[0] - s.pos[0]) / d;
        const awayZ = (p.pos[2] - s.pos[2]) / d;
        vx += awayX * 1.4;
        vz += awayZ * 1.4;
        if (d < 2.8 && p.dashCdTicks === 0 && !prevDash) {
          dash = true;
        }
      }
    }

    // Occasional dash when moving across open ground
    if (!dash && p.dashCdTicks === 0 && !prevDash && Math.hypot(vx, vz) > 0.5 && sim.simTick % 160 === 40) {
      if (sim.night !== 2 || p.pos[0] < 24 || p.pos[0] > 46) {
        dash = true;
      }
    }

    const mag = Math.hypot(vx, vz);
    if (mag > 1e-4) {
      vx /= mag;
      vz /= mag;
      const targetYaw = (Math.atan2(vx, vz) * 180) / Math.PI;
      let diff = ((targetYaw - smoothYawDeg + 540) % 360) - 180;
      smoothYawDeg += diff * Math.min(1, dt * 4);
    }

    // Convert world move (vx, vz) into camera-relative move [mx, mz]
    const theta = (smoothYawDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const mx = Math.max(-1, Math.min(1, vx * cosT - vz * sinT));
    const mz = Math.max(-1, Math.min(1, vx * sinT + vz * cosT));

    prevInteract = interact;
    prevPulse = pulse;
    prevDash = dash;
    prevJump = jump;

    return {
      frame: {
        move: [mx, mz],
        cam_yaw_deg: smoothYawDeg,
        jump,
        interact,
        pulse,
        dash
      },
      camYawDeg: smoothYawDeg
    };
  }

  function reset() {
    prevInteract = false;
    prevPulse = false;
    prevDash = false;
    prevJump = false;
  }

  return { step, reset };
}
