export const SIM_DT = 1 / 60;
export const TICK_RATE = 60;

/**
 * Horizontal XZ distance between two 3D points.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function distXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
}

/**
 * 3D Euclidean distance between two 3D points.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function dist3D(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
}

/**
 * Round a number to 3 decimal places for JSONL output, avoiding -0.
 * @param {number} n
 * @returns {number}
 */
export function round3(n) {
  const rounded = Math.round(n * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Round a 3D coordinate array to 3 decimal places.
 * @param {number[]} pos
 * @returns {number[]}
 */
export function roundPos(pos) {
  return [round3(pos[0]), round3(pos[1]), round3(pos[2])];
}
