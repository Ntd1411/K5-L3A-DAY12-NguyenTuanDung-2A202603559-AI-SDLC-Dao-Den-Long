import { round3 } from './math.js';

function ringPoints(centerX, centerZ, y, radius, count, startDeg = 0) {
  const pts = [];
  const stepDeg = 360 / count;
  for (let i = 0; i < count; i += 1) {
    const rad = ((startDeg + i * stepDeg) * Math.PI) / 180;
    pts.push([
      round3(centerX + Math.cos(rad) * radius),
      y,
      round3(centerZ + Math.sin(rad) * radius)
    ]);
  }
  return pts;
}

const NIGHT1_MOTE_SPAWNS = [
  ...ringPoints(0, 0, 0, 12, 8, 0),
  ...ringPoints(0, 0, 0, 33, 16, 0)
];

const NIGHT1_SHADE_SPAWNS = ringPoints(0, 0, 0, 37, 12, 15);

const NIGHT2_MOTE_SPAWNS = [
  ...ringPoints(0, 0, 0, 10, 4, 0),
  ...ringPoints(0, 0, 0, 22, 8, 0),
  ...ringPoints(70, 0, 0, 10, 4, 0),
  ...ringPoints(70, 0, 0, 22, 8, 0)
];

const NIGHT2_SHADE_SPAWNS = [
  ...ringPoints(0, 0, 0, 26, 8, 22.5),
  ...ringPoints(70, 0, 0, 26, 8, 22.5)
];

const NIGHT3_MOTE_SPAWNS = [
  ...ringPoints(0, 0, 0, 34, 18, 0),
  ...[20, 40, 60, 80, 100, 120, 140, 160].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return [round3(Math.cos(rad) * 18), 3, round3(Math.sin(rad) * 18)];
  }),
  ...ringPoints(0, 0, 6, 5, 4, 45)
];

const NIGHT3_SHADE_SPAWNS = ringPoints(0, 0, 0, 43, 16, 0);

export const MAPS = {
  1: {
    night: 1,
    name: 'Đảo Bến',
    elderQuote: 'Ngọn đèn đầu tiên luôn sáng lên từ sự bình tĩnh. Đừng để bóng tối dập tắt ngọn lửa trong tim con.',
    spawn: [0, 0, 0],
    durationKey: 'night1_duration_s',
    shadeSpeed: 4.0,
    shadeSpawnInterval: 480,
    maxShades: 6,
    hasDrifters: false,
    hasWind: false,
    lanterns: [
      { id: 'L1', pos: [0, 0, 25] },
      { id: 'L2', pos: [23.8, 0, 7.7] },
      { id: 'L3', pos: [14.7, 0, -20.2] },
      { id: 'L4', pos: [-14.7, 0, -20.2] },
      { id: 'L5', pos: [-23.8, 0, 7.7] }
    ],
    moteSpawns: NIGHT1_MOTE_SPAWNS,
    shadeSpawns: NIGHT1_SHADE_SPAWNS,
    charms: [],
    launchPads: []
  },
  2: {
    night: 2,
    name: 'Đảo Cau',
    elderQuote: 'Cây cầu tre nối hai bờ sương phủ. Hãy cẩn thận bước chân và dè chừng những dải Gió Lạc.',
    spawn: [0, 0, 0],
    durationKey: 'night2_duration_s',
    shadeSpeed: 4.0,
    shadeSpawnInterval: 420,
    maxShades: 8,
    hasDrifters: true,
    hasWind: false,
    lanterns: [
      { id: 'L1', pos: [0, 0, 20] },
      { id: 'L2', pos: [17, 0, -10] },
      { id: 'L3', pos: [-17, 0, -10] },
      { id: 'L4', pos: [70, 0, 20] },
      { id: 'L5', pos: [87, 0, -10] },
      { id: 'L6', pos: [53, 0, -10] }
    ],
    moteSpawns: NIGHT2_MOTE_SPAWNS,
    shadeSpawns: NIGHT2_SHADE_SPAWNS,
    charms: [{ id: 'C1', pos: [35, 0, 0] }],
    launchPads: [
      { id: 'P1', pos: [20, 0, 18], radius: 1.0, vy: 14, hSpeed: 24, target: [70, 0, 0] },
      { id: 'P2', pos: [50, 0, -18], radius: 1.0, vy: 14, hSpeed: 24, target: [0, 0, 0] }
    ]
  },
  3: {
    night: 3,
    name: 'Đảo Chuông',
    elderQuote: 'Gió biển đang gào thét quanh tháp chuông cổ. Thắp sáng cả ba tầng để đón bình minh trở lại.',
    spawn: [0, 0, 36],
    durationKey: 'night3_duration_s',
    shadeSpeed: 4.5,
    shadeSpawnInterval: 360,
    maxShades: 10,
    hasDrifters: true,
    hasWind: true,
    lanterns: [
      { id: 'L1', pos: [0, 6, 6] },
      { id: 'L2', pos: [18, 3, 10] },
      { id: 'L3', pos: [-18, 3, 10] },
      { id: 'L4', pos: [35, 0, -10] },
      { id: 'L5', pos: [-35, 0, -10] },
      { id: 'L6', pos: [20, 0, -35] },
      { id: 'L7', pos: [-20, 0, -35] }
    ],
    moteSpawns: NIGHT3_MOTE_SPAWNS,
    shadeSpawns: NIGHT3_SHADE_SPAWNS,
    charms: [
      { id: 'C1', pos: [30, 0, 25] },
      { id: 'C2', pos: [-30, 0, 25] }
    ],
    launchPads: [
      { id: 'P1', pos: [0, 3, 13], radius: 1.0, vy: 12, hSpeed: 8, dir: [0, -1] }
    ]
  }
};

const NIGHT3_RAMPS = [30, 150].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { ux: Math.cos(rad), uz: Math.sin(rad) };
});

function getNight3RampY(x, z) {
  for (const { ux, uz } of NIGHT3_RAMPS) {
    const proj = x * ux + z * uz;
    const perp = Math.abs(-x * uz + z * ux);
    if (proj >= 24 && proj <= 30 && perp <= 1.5) {
      return (3 * (30 - proj)) / 6;
    }
  }
  return null;
}

/**
 * Return all walkable surface heights at (x, z) for the given night.
 * @param {number} night
 * @param {number} x
 * @param {number} z
 * @returns {number[]}
 */
export function getSurfacesAt(night, x, z) {
  if (night === 1) {
    return x * x + z * z <= 40 * 40 ? [0] : [];
  }
  if (night === 2) {
    const inA = x * x + z * z <= 28 * 28;
    const inB = (x - 70) * (x - 70) + z * z <= 28 * 28;
    const inBridge = x >= 26 && x <= 44 && z >= -2 && z <= 2;
    return inA || inB || inBridge ? [0] : [];
  }
  if (night === 3) {
    const r = Math.hypot(x, z);
    if (r > 45) return [];
    const surfaces = [0];
    if (r >= 12 && r <= 24 && z > 0) surfaces.push(3);
    if (r <= 8) surfaces.push(6);
    const rampY = getNight3RampY(x, z);
    if (rampY !== null) surfaces.push(rampY);
    return surfaces;
  }
  return [];
}

/**
 * Highest walkable ground height at (x, z) reachable from currentY.
 * @param {number} night
 * @param {number} x
 * @param {number} z
 * @param {number} currentY
 * @returns {number|null}
 */
export function getGroundHeight(night, x, z, currentY = 0) {
  const surfaces = getSurfacesAt(night, x, z);
  let best = null;
  for (const s of surfaces) {
    if (s <= currentY + 0.35 && (best === null || s > best)) {
      best = s;
    }
  }
  return best;
}

/**
 * Resolve horizontal collisions against vertical tier cliffs and Night 3 bell tower.
 * @param {number} night
 * @param {number[]} pos - mutated in place [x, y, z]
 * @param {number} prevX
 * @param {number} prevZ
 */
export function resolveHorizontalObstacles(night, pos, prevX, prevZ) {
  if (night !== 3) return;
  const x = pos[0];
  const y = pos[1];
  const z = pos[2];

  // Bell tower at (0, 6..14, 0), radius 2.0
  if (y < 13.99) {
    const r = Math.hypot(x, z);
    if (r < 2.0) {
      if (r > 1e-6) {
        pos[0] = (x / r) * 2.0;
        pos[2] = (z / r) * 2.0;
      } else {
        pos[0] = 2.0;
        pos[2] = 0;
      }
    }
  }

  // Tier 2 cliff (r <= 8, Y = 6)
  const rAfter = Math.hypot(pos[0], pos[2]);
  if (y < 5.65 && rAfter < 8.0) {
    if (rAfter > 1e-6) {
      pos[0] = (pos[0] / rAfter) * 8.0;
      pos[2] = (pos[2] / rAfter) * 8.0;
    } else {
      pos[0] = prevX;
      pos[2] = prevZ;
    }
  }

  // Tier 1 cliff (12 <= r <= 24, z > 0, Y = 3)
  const rT1 = Math.hypot(pos[0], pos[2]);
  if (y < 2.65 && rT1 >= 12.0 && rT1 <= 24.0 && pos[2] > 0) {
    const rampY = getNight3RampY(pos[0], pos[2]);
    if (rampY === null || rampY > y + 0.35) {
      // Slide along X or Z if possible, else revert
      const prevInTier1 =
        Math.hypot(prevX, prevZ) >= 12.0 && Math.hypot(prevX, prevZ) <= 24.0 && prevZ > 0;
      if (!prevInTier1) {
        pos[0] = prevX;
        pos[2] = prevZ;
      }
    }
  }
}

export function getMapConfig(night) {
  return MAPS[night] ?? MAPS[1];
}
