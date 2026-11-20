const NAME_REGEX = /^[A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF]{3,12}$/;

/**
 * Validate leaderboard player name (3-12 chars, alphanumeric + underscore + Vietnamese letters).
 * @param {unknown} name
 * @returns {boolean}
 */
export function isValidLeaderboardName(name) {
  return typeof name === 'string' && NAME_REGEX.test(name.trim());
}

/**
 * Sort leaderboard entries by score desc, then achieved_at asc (earlier first), capped to top 10.
 * @param {Array<object>} entries
 * @returns {Array<object>}
 */
export function sortAndCapLeaderboard(entries) {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = Date.parse(a.achieved_at) || 0;
      const tb = Date.parse(b.achieved_at) || 0;
      if (ta !== tb) return ta - tb;
      return 0;
    })
    .slice(0, 10);
}

/**
 * Compute Ticket-04 benchmark metrics from an array of frame durations in ms.
 * @param {number[]} dtsMs
 * @returns {{ frames: number, avg_fps: number, p1_low_fps: number, frame_ms_p95: number }}
 */
export function computeBenchMetrics(dtsMs) {
  const n = dtsMs.length;
  if (n === 0) {
    return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  }
  const sumDt = dtsMs.reduce((acc, v) => acc + v, 0);
  const avgFps = sumDt > 0 ? (1000 * n) / sumDt : 0;

  const sortedDesc = [...dtsMs].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * n));
  let slowSum = 0;
  for (let i = 0; i < k; i += 1) {
    slowSum += sortedDesc[i];
  }
  const p1LowFps = slowSum > 0 ? 1000 / (slowSum / k) : 0;

  const sortedAsc = [...dtsMs].sort((a, b) => a - b);
  const p95Idx = Math.min(n - 1, Math.floor(0.95 * n));
  const frameMsP95 = sortedAsc[p95Idx];

  return {
    frames: n,
    avg_fps: Number(avgFps.toFixed(1)),
    p1_low_fps: Number(p1LowFps.toFixed(1)),
    frame_ms_p95: Number(frameMsP95.toFixed(2))
  };
}
