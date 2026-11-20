#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  isValidLeaderboardName,
  sortAndCapLeaderboard
} from '../src/sim/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const LEADERBOARD_PATH = path.join(ROOT, 'data', 'leaderboard.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function readLeaderboard(filePath = LEADERBOARD_PATH) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = Array.isArray(parsed) ? parsed : parsed?.entries;
    if (!Array.isArray(entries)) return [];
    return sortAndCapLeaderboard(entries);
  } catch {
    return [];
  }
}

export function writeLeaderboardAtomic(entries, filePath = LEADERBOARD_PATH) {
  const sorted = sortAndCapLeaderboard(entries);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify({ entries: sorted }, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, filePath);
  return sorted;
}

function parseArgs(argv) {
  let exportPath = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--export-leaderboard') {
      exportPath = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown flag: ${argv[i]}`);
    }
  }
  return { exportPath };
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
  } catch {
    // Ignore if no desktop launcher is available
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (args.exportPath) {
    const entries = readLeaderboard();
    const outPath = path.resolve(args.exportPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8');
    console.log(`Exported ${entries.length} leaderboard entries to ${outPath}`);
    return;
  }

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error('Missing dist/index.html. Run "npm run build" first.');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');

    if (reqUrl.pathname === '/api/leaderboard') {
      if (req.method === 'GET') {
        const entries = readLeaderboard();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ entries }));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 64 * 1024) req.destroy();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            if (!isValidLeaderboardName(payload.name)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid player name (3-12 chars).' }));
              return;
            }
            const entry = {
              name: payload.name.trim(),
              score: Number.isFinite(payload.score) ? Math.max(0, Math.floor(payload.score)) : 0,
              nights_won: Number.isInteger(payload.nights_won)
                ? Math.max(0, Math.min(3, payload.nights_won))
                : 0,
              achieved_at:
                typeof payload.achieved_at === 'string' && payload.achieved_at
                  ? payload.achieved_at
                  : new Date().toISOString(),
              seed: Number.isInteger(payload.seed) ? payload.seed : 42
            };
            const updated = writeLeaderboardAtomic([...readLeaderboard(), entry]);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ entries: updated }));
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
          }
        });
        return;
      }
    }

    const relPath = reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname.replace(/^\/+/, '');
    const filePath = path.resolve(DIST_DIR, relPath);
    if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(0, '127.0.0.1', () => {
    const addr = server.address();
    const url = `http://127.0.0.1:${addr.port}/`;
    console.log(`Đảo Đèn Lồng running at ${url}`);
    if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY || process.platform === 'darwin') {
      openBrowser(url);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
