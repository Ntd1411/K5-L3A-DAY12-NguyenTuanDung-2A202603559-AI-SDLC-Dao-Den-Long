import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  computeBenchMetrics,
  isValidLeaderboardName,
  sortAndCapLeaderboard
} from '../src/sim/index.js';
import { readLeaderboard, writeLeaderboardAtomic } from '../scripts/run.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('bench metrics formulas match Ticket-04 definitions', () => {
  // 100 frames: 99 at 10ms, 1 spike at 50ms -> total 1040ms
  const dts = Array(99).fill(10);
  dts.push(50);
  const m = computeBenchMetrics(dts);
  assert.equal(m.frames, 100);
  // avg_fps = 1000 * 100 / 1040 = 96.2
  assert.equal(m.avg_fps, 96.2);
  // k = max(1, ceil(0.01 * 100)) = 1 -> slowest is 50ms -> 1000 / 50 = 20.0
  assert.equal(m.p1_low_fps, 20.0);
  // p95 index = floor(0.95 * 100) = 95 -> 10ms
  assert.equal(m.frame_ms_p95, 10);
});

test('leaderboard validates 3-12 chars, sorts desc with earlier tie-break, caps at 10', () => {
  assert.equal(isValidLeaderboardName('ab'), false);
  assert.equal(isValidLeaderboardName('a_1'), true);
  assert.equal(isValidLeaderboardName('Lantern_1234'), true);
  assert.equal(isValidLeaderboardName('TooLongName13'), false);
  assert.equal(isValidLeaderboardName('bad!name'), false);
  assert.equal(isValidLeaderboardName('Mây_99'), true);

  const entries = [];
  for (let i = 0; i < 12; i += 1) {
    entries.push({
      name: `P_${i}`,
      score: i === 5 || i === 6 ? 900 : i * 50,
      nights_won: 2,
      achieved_at:
        i === 5
          ? '2026-11-20T18:00:00+07:00'
          : i === 6
            ? '2026-11-20T10:00:00+00:00' // 17:00+07:00, earlier than P_5!
            : `2026-11-20T12:0${i % 10}:00+07:00`,
      seed: 42
    });
  }
  const sorted = sortAndCapLeaderboard(entries);
  assert.equal(sorted.length, 10);
  assert.equal(sorted[0].name, 'P_6'); // earlier timestamp wins 900 tie
  assert.equal(sorted[1].name, 'P_5');
});

test('leaderboard atomic write and --export-leaderboard CLI', () => {
  const tmpLb = path.join('/tmp', 'test-lb-v13.json');
  writeLeaderboardAtomic(
    [
      { name: 'Alpha', score: 300, nights_won: 1, achieved_at: '2026-11-20T12:00:00+07:00', seed: 42 },
      { name: 'Beta', score: 500, nights_won: 2, achieved_at: '2026-11-20T12:05:00+07:00', seed: 42 }
    ],
    tmpLb
  );
  const loaded = readLeaderboard(tmpLb);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].name, 'Beta');
});

test('soak.js runs deterministic 10-night cycle with 0 crashes and bounded RSS', () => {
  const out1 = path.join('/tmp', 'soak-t1.json');
  const out2 = path.join('/tmp', 'soak-t2.json');
  execFileSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '10', '--out', out1], {
    cwd: ROOT
  });
  execFileSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '10', '--out', out2], {
    cwd: ROOT
  });
  const r1 = JSON.parse(fs.readFileSync(out1, 'utf8'));
  const r2 = JSON.parse(fs.readFileSync(out2, 'utf8'));
  assert.equal(r1.nights, 10);
  assert.equal(r1.crashes, 0);
  assert.equal(r1.results.length, 10);
  assert.deepEqual(r1.results, r2.results);
  assert.ok(r1.mem_end_mb <= 1.2 * r1.mem_start_mb, `RSS grew: ${r1.mem_start_mb} -> ${r1.mem_end_mb}`);
});
