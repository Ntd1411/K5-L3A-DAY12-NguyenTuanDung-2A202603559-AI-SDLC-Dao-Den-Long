export class FormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FormatError';
  }
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function assertVec3(v, label) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isFiniteNumber)) {
    throw new FormatError(`${label} must be a 3-number array.`);
  }
}

function assertNonNegInt(v, label) {
  if (!Number.isInteger(v) || v < 0) {
    throw new FormatError(`${label} must be a non-negative integer.`);
  }
}

const VALID_SHADE_STATES = new Set(['spawning', 'wander', 'chase', 'recoil', 'stunned']);
const VALID_DRIFTER_STATES = new Set(['idle', 'chase', 'flee', 'removed']);

/**
 * Validate parsed inputs JSON according to Test Contract v1.1.
 * @param {unknown} raw
 * @returns {{ frames: Array<object> }}
 */
export function validateInputs(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new FormatError('Inputs file must be a JSON object.');
  }
  if (!Array.isArray(raw.frames)) {
    throw new FormatError('Inputs file must contain a "frames" array.');
  }
  let prevTick = -1;
  for (let i = 0; i < raw.frames.length; i += 1) {
    const frame = raw.frames[i];
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      throw new FormatError(`frames[${i}] must be an object.`);
    }
    if (!Number.isInteger(frame.tick) || frame.tick < 0) {
      throw new FormatError(`frames[${i}].tick must be a non-negative integer.`);
    }
    if (frame.tick <= prevTick) {
      throw new FormatError(
        `frames[${i}].tick (${frame.tick}) must be strictly increasing (previous was ${prevTick}).`
      );
    }
    prevTick = frame.tick;

    if (frame.move !== undefined) {
      if (
        !Array.isArray(frame.move) ||
        frame.move.length !== 2 ||
        !frame.move.every(isFiniteNumber)
      ) {
        throw new FormatError(`frames[${i}].move must be a 2-number array.`);
      }
      if (
        frame.move[0] < -1 ||
        frame.move[0] > 1 ||
        frame.move[1] < -1 ||
        frame.move[1] > 1
      ) {
        throw new FormatError(`frames[${i}].move components must be in [-1, 1].`);
      }
    }
    if (frame.cam_yaw_deg !== undefined && !isFiniteNumber(frame.cam_yaw_deg)) {
      throw new FormatError(`frames[${i}].cam_yaw_deg must be a finite number.`);
    }
    for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (frame[key] !== undefined && typeof frame[key] !== 'boolean') {
        throw new FormatError(`frames[${i}].${key} must be a boolean.`);
      }
    }
  }
  return raw;
}

/**
 * Validate parsed scenario JSON according to Test Contract v1.1.
 * @param {unknown} raw
 * @returns {object}
 */
export function validateScenario(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new FormatError('Scenario file must be a JSON object.');
  }
  if (raw.player !== undefined) {
    if (!raw.player || typeof raw.player !== 'object' || Array.isArray(raw.player)) {
      throw new FormatError('scenario.player must be an object.');
    }
    if (raw.player.pos !== undefined) {
      assertVec3(raw.player.pos, 'scenario.player.pos');
    }
    for (const key of [
      'carried',
      'flames',
      'invuln_ticks',
      'dash_cd_ticks',
      'pulse_cd_ticks',
      'charm_ticks'
    ]) {
      if (raw.player[key] !== undefined) {
        assertNonNegInt(raw.player[key], `scenario.player.${key}`);
      }
    }
  }
  for (const key of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean') {
      throw new FormatError(`scenario.${key} must be a boolean.`);
    }
  }
  if (raw.motes !== undefined) {
    if (!Array.isArray(raw.motes)) {
      throw new FormatError('scenario.motes must be an array.');
    }
    raw.motes.forEach((m, i) => {
      if (Array.isArray(m)) {
        assertVec3(m, `scenario.motes[${i}]`);
      } else if (m && typeof m === 'object') {
        assertVec3(m.pos, `scenario.motes[${i}].pos`);
        if (m.ttl_s !== undefined && (!isFiniteNumber(m.ttl_s) || m.ttl_s < 0)) {
          throw new FormatError(`scenario.motes[${i}].ttl_s must be non-negative.`);
        }
        if (m.ttl_ticks !== undefined) {
          assertNonNegInt(m.ttl_ticks, `scenario.motes[${i}].ttl_ticks`);
        }
      } else {
        throw new FormatError(`scenario.motes[${i}] must be a [x,y,z] array or {pos}.`);
      }
    });
  }
  if (raw.shades !== undefined) {
    if (!Array.isArray(raw.shades)) {
      throw new FormatError('scenario.shades must be an array.');
    }
    raw.shades.forEach((s, i) => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) {
        throw new FormatError(`scenario.shades[${i}] must be an object.`);
      }
      assertVec3(s.pos, `scenario.shades[${i}].pos`);
      if (s.state !== undefined && !VALID_SHADE_STATES.has(s.state)) {
        throw new FormatError(`scenario.shades[${i}].state is invalid: "${s.state}".`);
      }
      if (s.state_ticks_left !== undefined) {
        assertNonNegInt(s.state_ticks_left, `scenario.shades[${i}].state_ticks_left`);
      }
    });
  }
  if (raw.drifters !== undefined) {
    if (!Array.isArray(raw.drifters)) {
      throw new FormatError('scenario.drifters must be an array.');
    }
    raw.drifters.forEach((d, i) => {
      if (!d || typeof d !== 'object' || Array.isArray(d)) {
        throw new FormatError(`scenario.drifters[${i}] must be an object.`);
      }
      assertVec3(d.pos, `scenario.drifters[${i}].pos`);
      if (d.state !== undefined && !VALID_DRIFTER_STATES.has(d.state)) {
        throw new FormatError(`scenario.drifters[${i}].state is invalid: "${d.state}".`);
      }
      if (d.stolen !== undefined) {
        assertNonNegInt(d.stolen, `scenario.drifters[${i}].stolen`);
      }
      if (d.state_ticks_left !== undefined) {
        assertNonNegInt(d.state_ticks_left, `scenario.drifters[${i}].state_ticks_left`);
      }
    });
  }
  if (raw.charms !== undefined) {
    if (!Array.isArray(raw.charms)) {
      throw new FormatError('scenario.charms must be an array.');
    }
    raw.charms.forEach((c, i) => {
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        throw new FormatError(`scenario.charms[${i}] must be an object.`);
      }
      if (typeof c.id !== 'string' || !c.id) {
        throw new FormatError(`scenario.charms[${i}].id must be a non-empty string.`);
      }
      if (c.pos !== undefined) {
        assertVec3(c.pos, `scenario.charms[${i}].pos`);
      }
      if (c.available !== undefined && typeof c.available !== 'boolean') {
        throw new FormatError(`scenario.charms[${i}].available must be a boolean.`);
      }
      if (c.respawn_s !== undefined && (!isFiniteNumber(c.respawn_s) || c.respawn_s < 0)) {
        throw new FormatError(`scenario.charms[${i}].respawn_s must be non-negative.`);
      }
      if (c.respawn_ticks !== undefined) {
        assertNonNegInt(c.respawn_ticks, `scenario.charms[${i}].respawn_ticks`);
      }
    });
  }
  if (raw.lanterns !== undefined) {
    if (!Array.isArray(raw.lanterns)) {
      throw new FormatError('scenario.lanterns must be an array.');
    }
    raw.lanterns.forEach((l, i) => {
      if (!l || typeof l !== 'object' || Array.isArray(l)) {
        throw new FormatError(`scenario.lanterns[${i}] must be an object.`);
      }
      if (typeof l.id !== 'string' || !l.id) {
        throw new FormatError(`scenario.lanterns[${i}].id must be a non-empty string.`);
      }
      if (l.pos !== undefined) {
        assertVec3(l.pos, `scenario.lanterns[${i}].pos`);
      }
      if (l.deposited !== undefined) {
        assertNonNegInt(l.deposited, `scenario.lanterns[${i}].deposited`);
      }
      if (l.lit !== undefined && typeof l.lit !== 'boolean') {
        throw new FormatError(`scenario.lanterns[${i}].lit must be a boolean.`);
      }
    });
  }
  if (
    raw.time_left_s !== undefined &&
    (!isFiniteNumber(raw.time_left_s) || raw.time_left_s < 0)
  ) {
    throw new FormatError('scenario.time_left_s must be a non-negative finite number.');
  }
  return raw;
}
