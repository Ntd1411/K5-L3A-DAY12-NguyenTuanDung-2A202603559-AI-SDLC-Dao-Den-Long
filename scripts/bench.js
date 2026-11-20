#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function parseArgs(argv) {
  const args = { seed: 42, duration: 30, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--seed') {
      args.seed = Number(next);
      i += 1;
    } else if (flag === '--duration') {
      args.duration = Number(next);
      i += 1;
    } else if (flag === '--out') {
      args.out = next;
      i += 1;
    } else {
      throw new Error(`Unknown flag: ${flag}`);
    }
  }
  if (!Number.isInteger(args.seed)) throw new Error('--seed must be an integer.');
  if (!Number.isFinite(args.duration) || args.duration <= 0) {
    throw new Error('--duration must be positive.');
  }
  if (!args.out) throw new Error('--out is required.');
  return args;
}

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function readProcPeakRssMb(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = /VmHWM:\s+(\d+)\s+kB/.exec(status);
    if (match) {
      return Math.round(Number(match[1]) / 1024);
    }
  } catch {
    // Not on Linux or process already exited
  }
  return null;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    process.exit(1);
  }

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error('Missing dist/index.html. Run "npm run build" first.');
    process.exit(1);
  }

  const chromeBin = findChromeBinary();
  if (!chromeBin) {
    console.error('No Chrome/Chromium binary found. Set CHROME_BIN to run bench.');
    process.exit(1);
  }

  let resolveBench;
  let rejectBench;
  const benchPromise = new Promise((resolve, reject) => {
    resolveBench = resolve;
    rejectBench = reject;
  });

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    if (reqUrl.pathname === '/api/bench-result' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
        try {
          resolveBench(JSON.parse(body));
        } catch (err) {
          rejectBench(err);
        }
      });
      return;
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

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}/?bench=1&seed=${args.seed}&duration=${args.duration}`;

  const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const chromeArgs = [
    `--user-data-dir=${tmpUserData}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu-vsync',
    '--window-size=1280,720',
    ...(hasDisplay
      ? [`--app=${targetUrl}`]
      : ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader-webgl', targetUrl])
  ];

  const launchTimeMs = performance.now();
  const child = spawn(chromeBin, chromeArgs, { stdio: 'ignore' });

  let peakMemMb = null;
  const memSampler = setInterval(() => {
    const rss = readProcPeakRssMb(child.pid);
    if (rss !== null) {
      peakMemMb = peakMemMb === null ? rss : Math.max(peakMemMb, rss);
    }
  }, 500);

  const timeoutMs = (args.duration + 35) * 1000;
  const timer = setTimeout(() => {
    rejectBench(new Error(`Benchmark timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  let payload;
  try {
    payload = await benchPromise;
  } finally {
    clearInterval(memSampler);
    clearTimeout(timer);
    child.kill('SIGTERM');
    server.close();
    try {
      fs.rmSync(tmpUserData, { recursive: true, force: true });
    } catch {
      // Chrome may still be releasing lockfiles
    }
  }

  const totalLoadMs = Math.round(payload.load_ms ?? performance.now() - launchTimeMs);
  const result = {
    contract_version: '1.3',
    avg_fps: payload.avg_fps,
    p1_low_fps: payload.p1_low_fps,
    frame_ms_p95: payload.frame_ms_p95,
    frames: payload.frames,
    load_ms: totalLoadMs,
    peak_mem_mb: peakMemMb,
    vsync_off: true,
    renderer: payload.renderer || 'Three.js WebGL2',
    os: `${os.type()} ${os.release()} (${os.arch()})`
  };

  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Benchmark complete: avg_fps=${result.avg_fps}, p1_low=${result.p1_low_fps}, frames=${result.frames}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
