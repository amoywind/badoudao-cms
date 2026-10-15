/**
 * Measure horizontal overflow at a real phone width.
 *
 *   node scripts/check-overflow.js [path …]
 *
 * There was no overflow. The screenshots said there was, on six bands of
 * content across four pages, and a fix built on that diagnosis changed
 * nothing when measured properly.
 *
 * The reason is that --window-size=390 does not give a 390px viewport in
 * headless Edge. It gives a 754px viewport and a 390px-wide image, so the
 * right-hand 364px is simply not in the picture. Text that wrapped at 754
 * appears to run off the edge at 390. Reading the crop as "overflowing" is
 * reading a rendering artefact as a layout bug.
 *
 * This drives the browser through the DevTools protocol instead, sets the
 * viewport where it actually takes effect, and asks the page for
 * document.scrollWidth against clientWidth. That number cannot lie the way
 * a screenshot can.
 *
 * Edge must be listening on port 9444:
 *   msedge --headless=new --disable-gpu --remote-debugging-port=9444 \
 *          --user-data-dir=<temp> <url>
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const WebSocket = require('ws');

const EDGE = process.env.EDGE_PATH
  || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ORIGIN = process.env.SITE_ORIGIN || 'https://www.oemwallclocks.com';
const PORT = 9444;

const DEFAULT_PATHS = [
  '/', '/products', '/products/wall-clocks', '/articles', '/news',
  '/contact', '/p/certification', '/p/factory',
  '/products/wall-clocks/12-inch-round-plastic-quartz-wall-clock'
];

const WIDTH = Number(process.env.W || 390);
const HEIGHT = Number(process.env.H || 844);

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const rows = ['VW=' + vw + '  SCROLLW=' + sw + '  OVERFLOW=' + (sw - vw)];
  if (sw > vw + 1) {
    const all = document.querySelectorAll('body *');
    let n = 0;
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0) {
        const cls = (typeof el.className === 'string' ? el.className : '').trim();
        const cs = getComputedStyle(el);
        rows.push('  ' + Math.round(r.right - vw) + 'px  '
          + el.tagName.toLowerCase() + (cls ? '.' + cls.split(/\\s+/).slice(0, 2).join('.') : '')
          + '  w=' + Math.round(r.width)
          + '  ws=' + cs.whiteSpace
          + '  "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '"');
        if (++n >= 12) break;
      }
    }
  }
  return rows.join('\\n');
})()`;

const httpGet = (p) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

const waitForBrowser = async (tries = 20) => {
  for (let i = 0; i < tries; i++) {
    try { return await httpGet('/json/version'); } catch { await new Promise((r) => setTimeout(r, 600)); }
  }
  throw new Error('浏览器未在 ' + PORT + ' 端口响应');
};

function openBrowser() {
  const dir = path.join(os.tmpdir(), 'edge-ovf-' + process.pid);
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + dir,
    'about:blank'
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  return { child, dir };
}

function evaluate(ws, expression) {
  return new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 1e9);
    const timer = setTimeout(() => rej(new Error('CDP 超时')), 15000);
    const on = (raw) => {
      const m = JSON.parse(raw);
      if (m.id === id) {
        clearTimeout(timer);
        ws.off('message', on);
        if (m.error) rej(new Error(m.error.message));
        else res(m.result);
      }
    };
    ws.on('message', on);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
  });
}

(async () => {
  const paths = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PATHS;
  const { dir } = openBrowser();
  let failed = 0;

  try {
    await waitForBrowser();
    console.log(`横向溢出检查 @ ${WIDTH}px\n`);

    for (const p of paths) {
      const target = await new Promise((res, rej) => {
        http.get({ host: '127.0.0.1', port: PORT, path: '/json/new?' + encodeURIComponent(ORIGIN + p) }, (r) => {
          let d = ''; r.on('data', (c) => (d += c));
          r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
        }).on('error', rej);
      }).catch(() => null);

      const page = target || (await httpGet('/json/list')).find((x) => x.type === 'page');
      if (!page) { console.log(p.padEnd(52) + '打不开'); failed++; continue; }

      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r) => ws.on('open', r));

      await new Promise((r) => {
        const id = 1;
        const on = (raw) => { if (JSON.parse(raw).id === id) { ws.off('message', on); r(); } };
        ws.on('message', on);
        ws.send(JSON.stringify({
          id,
          method: 'Emulation.setDeviceMetricsOverride',
          params: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true }
        }));
      });

      await new Promise((r) => setTimeout(r, 1400));
      const out = await evaluate(ws, PROBE);
      const text = out.result.value;
      const over = /OVERFLOW=(-?\d+)/.exec(text)[1];

      console.log(p.padEnd(52) + (over === '0' ? 'OK' : '溢出 ' + over + 'px'));
      if (over !== '0') {
        failed++;
        text.split('\n').slice(1).forEach((l) => console.log('    ' + l.trim()));
      }
      ws.close();
    }

    console.log('\n' + (failed
      ? failed + ' 个页面有横向溢出。'
      : '全部 ' + paths.length + ' 个页面在 ' + WIDTH + 'px 下无横向溢出。'));
    process.exitCode = failed ? 1 : 0;
  } catch (e) {
    console.error('检查失败:', e.message);
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
})();