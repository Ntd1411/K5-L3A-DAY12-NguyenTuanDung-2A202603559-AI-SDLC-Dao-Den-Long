#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FormatError,
  createSimulationState,
  serializeEnd,
  serializeSnapshot,
  stepSimulation,
  validateInputs,
  validateScenario
} from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    seed: 42,
    night: 1,
    ticks: null,
    out: null,
    snapshotEvery: 10,
    scenario: null,
    inputs: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--seed':
        args.seed = Number(next);
        i += 1;
        break;
      case '--night':
        args.night = Number(next);
        i += 1;
        break;
      case '--ticks':
        args.ticks = Number(next);
        i += 1;
        break;
      case '--out':
        args.out = next;
        i += 1;
        break;
      case '--snapshot-every':
        args.snapshotEvery = Number(next);
        i += 1;
        break;
      case '--scenario':
        args.scenario = next;
        i += 1;
        break;
      case '--inputs':
        args.inputs = next;
        i += 1;
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  if (!Number.isInteger(args.seed)) {
    throw new Error('--seed must be an integer.');
  }
  if (![1, 2, 3].includes(args.night)) {
    throw new Error('--night must be 1, 2, or 3.');
  }
  if (!Number.isInteger(args.ticks) || args.ticks < 0) {
    throw new Error('--ticks must be a non-negative integer.');
  }
  if (!Number.isInteger(args.snapshotEvery) || args.snapshotEvery < 1) {
    throw new Error('--snapshot-every must be a positive integer.');
  }
  if (!args.out) {
    throw new Error('--out is required.');
  }
  return args;
}

function readJsonFile(filePath, label) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${label} file "${filePath}": ${err.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new FormatError(`Invalid JSON in ${label} file "${filePath}": ${err.message}`);
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    process.exit(1);
  }

  let contract;
  try {
    contract = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')
    );
  } catch (err) {
    console.error(`Failed to read game.contract.json: ${err.message}`);
    process.exit(1);
  }

  let scenario = null;
  const inputsByTick = new Map();

  try {
    if (args.scenario) {
      scenario = validateScenario(readJsonFile(args.scenario, 'scenario'));
    }
    if (args.inputs) {
      const inputs = validateInputs(readJsonFile(args.inputs, 'inputs'));
      for (const frame of inputs.frames) {
        inputsByTick.set(frame.tick, frame);
      }
    }
  } catch (err) {
    if (err instanceof FormatError) {
      console.error(`Format error: ${err.message}`);
      process.exit(2);
    }
    console.error(err.message);
    process.exit(1);
  }

  const sim = createSimulationState({
    night: args.night,
    seed: args.seed,
    tuning: contract.tuning,
    scenario
  });

  const lines = [];
  lines.push(JSON.stringify(serializeSnapshot(sim)));
  lines.push(
    JSON.stringify({
      type: 'event',
      tick: 0,
      name: 'night_start',
      data: { night: sim.night }
    })
  );

  for (let k = 0; k < args.ticks; k += 1) {
    if (sim.state === 'won' || sim.state === 'lost') break;
    const framePatch = inputsByTick.get(k) ?? null;
    const events = stepSimulation(sim, framePatch);
    for (const event of events) {
      lines.push(JSON.stringify(event));
    }
    if (sim.tick % args.snapshotEvery === 0) {
      lines.push(JSON.stringify(serializeSnapshot(sim)));
    }
  }

  lines.push(JSON.stringify(serializeEnd(sim)));

  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
}

main();
