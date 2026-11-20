#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import v8 from 'node:v8';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

v8.setFlagsFromString('--expose_gc');
const runGc = vm.runInNewContext('gc');
import {
  TICK_RATE,
  createRng,
  createSimulationState,
  getMapConfig,
  round3,
  stepSimulation
} from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { seed: 7, nights: 10, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--seed') {
      args.seed = Number(next);
      i += 1;
    } else if (flag === '--nights') {
      args.nights = Number(next);
      i += 1;
    } else if (flag === '--out') {
      args.out = next;
      i += 1;
    } else {
      throw new Error(`Unknown flag: ${flag}`);
    }
  }
  if (!Number.isInteger(args.seed)) throw new Error('--seed must be an integer.');
  if (!Number.isInteger(args.nights) || args.nights < 1) {
    throw new Error('--nights must be a positive integer.');
  }
  if (!args.out) throw new Error('--out is required.');
  return args;
}

function getRssMb() {
  return Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2));
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    process.exit(1);
  }

  const contract = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
  );

  // Warm up V8 JIT across all 3 nights before measuring baseline RSS
  for (const wNight of [1, 2, 3]) {
    let warmSim = createSimulationState({ night: wNight, seed: args.seed, tuning: contract.tuning });
    for (let w = 0; w < 2400 && warmSim.state === 'playing'; w += 1) {
      stepSimulation(warmSim, {
        move: [Math.cos(w * 0.1), Math.sin(w * 0.1)],
        jump: w % 20 === 0,
        dash: w % 30 === 0,
        pulse: w % 50 === 0,
        interact: w % 15 === 0
      });
    }
    warmSim = null;
  }
  runGc();

  const startTimeMs = performance.now();
  const results = [];
  let crashes = 0;
  let memStartMb = null;

  for (let i = 0; i < args.nights; i += 1) {
    const night = (i % 3) + 1;
    const nightSeed = args.seed + i;
    const inputRng = createRng((args.seed * 997 + i) >>> 0);
    let sim = createSimulationState({
      night,
      seed: nightSeed,
      tuning: contract.tuning
    });

    if (i === 0) {
      runGc();
      memStartMb = getRssMb();
    }

    const maxTicks = Math.round(contract.tuning[getMapConfig(night).durationKey] * TICK_RATE) + 5;
    let move = [0, 1];

    try {
      for (let t = 0; t < maxTicks && sim.state === 'playing'; t += 1) {
        if (t % 30 === 0) {
          const angle = inputRng() * Math.PI * 2;
          move = [Math.cos(angle), Math.sin(angle)];
        }
        const frame = {
          move,
          jump: inputRng() < 0.05,
          dash: inputRng() < 0.03,
          pulse: inputRng() < 0.02,
          interact: inputRng() < 0.10
        };
        stepSimulation(sim, frame);
      }
      results.push(sim.state === 'won' ? 'won' : 'lost');
    } catch (err) {
      crashes += 1;
      results.push('crash');
      console.error(`Night ${i + 1} crashed:`, err);
    }

    sim = null;
    runGc();
  }

  runGc();
  const memEndMb = getRssMb();
  const durationS = round3((performance.now() - startTimeMs) / 1000);

  const report = {
    nights: args.nights,
    crashes,
    results,
    mem_start_mb: memStartMb,
    mem_end_mb: memEndMb,
    duration_s: durationS
  };

  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Soak test complete: ${args.nights} nights, crashes=${crashes}, duration=${durationS}s`);
}

main();
