/**
 * Measure the rendered page with a real browser and report every element
 * whose right edge passes the viewport.
 *
 * Three earlier attempts to find this by reading the CSS failed, each in
 * a different way, because the question is not "which rule applies" but
 * "how wide is this element after the browser has resolved everything".
 * This asks the browser directly.
 *
 * Uses Edge's DevTools protocol over a WebSocket-free HTTP endpoint plus
 * --remote-debugging-port, driven through Runtime.evaluate. No npm
 * dependency, no driver.
 *
 *   node scripts/measure.js [width] [page]
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';
const WIDTH = parseInt(process.argv[2] || '390', 10);
const PAGE = process.argv[3] || '/';
const PORT = 9333;

const profile = path.join(os.tmpdir(), `measure-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},900`,
    'about:blank'
  ], { stdio: 'ignore', detached: true });

  let target = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const list = await getJSON(`http://127.0.0.1:${PORT}/json/list`);
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch {}
  }
  if (!target) {
    console.log('无法连接到 Edge 调试端口');
    try { process.kill(-edge.pid); } catch {}
    process.exit(2);
  }

  const WebSocket = require('ws');
  let ws;
  try { ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false }); }
  catch {
    console.log('需要 ws 模块，改用像素法：node scripts/check-clip.js');
    try { process.kill(-edge.pid); } catch {}
    process.exit(2);
  }

  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });

  const send = (method, params = {}) => new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  await new Promise((r) => ws.on('open', r));

  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 700
  });
  await send('Page.enable');
  await send('Page.navigate', { url: `${HOST}${PAGE}?cb=${Date.now()}` });
  await sleep(3500);

  const expression = `(() => {
    const vw = document.documentElement.clientWidth;
    const out = { vw, scrollW: document.documentElement.scrollWidth, items: [] };
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.display === 'none') return;
      if (r.right > vw + 1 || r.left < -1) {
        out.items.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 44),
          w: Math.round(r.width),
          l: Math.round(r.left),
          r: Math.round(r.right),
          t: (el.textContent || '').trim().slice(0, 32)
        });
      }
    });
    return JSON.stringify(out);
  })()`;

  const res = await send('Runtime.evaluate', { expression, returnByValue: true });
  const raw = res.result?.result?.value;

  try { process.kill(-edge.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!raw) { console.log('未能执行测量脚本'); process.exit(2); }

  const d = JSON.parse(raw);
  console.log(`\n视口 ${d.vw}px   scrollWidth ${d.scrollW}px   溢出元素 ${d.items.length}\n`);

  if (!d.items.length) { console.log('没有元素超出视口。'); process.exit(0); }

  /* Deepest first: a parent is wide because a child is, and the child is
     the one to fix. */
  for (const it of d.items.slice(0, 18)) {
    console.log(`  ${it.tag.padEnd(7)} w=${String(it.w).padStart(5)} l=${String(it.l).padStart(5)} r=${String(it.r).padStart(5)}  .${it.cls}`);
    if (it.t) console.log(`          "${it.t}"`);
  }
  process.exit(1);
})();