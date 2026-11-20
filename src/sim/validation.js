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

/**
 * Validate parsed inputs JSON according to Test Contract v1.0.
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
    for (const key of ['jump', 'interact', 'pulse', 'dash']) {
      if (frame[key] !== undefined && typeof frame[key] !== 'boolean') {
        throw new FormatError(`frames[${i}].${key} must be a boolean.`);
      }
    }
  }
  return raw;
}

/**
 * Validate parsed scenario JSON according to Test Contract v1.0.
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
    if (
      raw.player.carried !== undefined &&
      (!Number.isInteger(raw.player.carried) || raw.player.carried < 0)
    ) {
      throw new FormatError('scenario.player.carried must be a non-negative integer.');
    }
    if (
      raw.player.flames !== undefined &&
      (!Number.isInteger(raw.player.flames) || raw.player.flames < 0)
    ) {
      throw new FormatError('scenario.player.flames must be a non-negative integer.');
    }
  }
  for (const key of ['random_motes', 'random_shades']) {
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
      if (
        l.deposited !== undefined &&
        (!Number.isInteger(l.deposited) || l.deposited < 0)
      ) {
        throw new FormatError(`scenario.lanterns[${i}].deposited must be a non-negative integer.`);
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
