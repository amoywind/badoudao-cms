/**
 * Measure every image on every page at real phone widths.
 *
 *   node scripts/check-images.js
 *
 * Screenshots of a phone-width page in headless Edge are cropped, not
 * narrow, so they cannot show this — which is how a product photo
 * rendering at 700px inside a 350px viewport reached production. It also
 * happened twice that check-overflow.js passed: it measures whether the
 * *document* scrolls sideways, and an oversized image inside
 * overflow:hidden is not a document overflow. The page does not scroll;
 * the picture is simply wrong.
 *
 * So this asks a different question, per image, at each width:
 *   - does the rendered box exceed its container?
 *   - is it larger than the viewport?
 *   - does it exceed the natural size it needs?
 * and reports the ratio, so "too big" is a number rather than an opinion.
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
const PORT = 9466;

const WIDTHS = (process.env.W || '390,360,414').split(',').map(Number);

const PAGES = [
  '/', '/products', '/products/wall-clocks', '/products/metal-wall-clocks',
  '/products/resin-wall-clocks', '/articles', '/news', '/contact',
  '/p/factory', '/p/quality', '/p/certification', '/p/oem-odm',
  '/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock'
];

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, bad: [], all: 0 };
  document.querySelectorAll('img').forEach((img) => {
    if (!img.getBoundingClientRect().width) return;   // not laid out
    out.all++;
    const r = img.getBoundingClientRect();
    const p = img.parentElement;
    const pr = p ? p.getBoundingClientRect() : null;
    const cs = getComputedStyle(img);
    const nat = img.naturalWidth || 0;

    const issues = [];
    if (r.width > vw + 1) issues.push('wider than viewport');
    if (pr && r.width > pr.width + 1) {
      issues.push('wider than container by ' + Math.round(r.width - pr.width) + 'px');
    }
    /* An image rendered far larger than its natural width is being
       upscaled, which is both slow and soft. */
    if (nat && r.width > nat * 1.15 && !cs.objectFit) {
      issues.push('upscaled ' + Math.round(r.width / nat * 100) + '% (' + nat + '→' + Math.round(r.width) + ')');
    }
    if (issues.length) {
      out.bad.push({
        src: (img.currentSrc || img.src || '').split('/').pop().slice(0, 34),
        w: Math.round(r.width),
        h: Math.round(r.height),
        nat,
        cls: (img.className || '').slice(0, 26),
        why: issues.join('; ')
      });
    }
  });
  return out;
})()`;

const httpGet = (p) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

const wait = async (n = 20) => {
  for (let i = 0; i < n; i++) {
    try { return await httpGet('/json/version'); } catch { await new Promise((r) => setTimeout(r, 600)); }
  }
  throw new Error('浏览器未响应');
};

const rpc = (ws) => (method, params) => new Promise((res, rej) => {
  const id = Math.floor(Math.random() * 1e9);
  const timer = setTimeout(() => rej(new Error('CDP 超时')), 20000);
  const on = (raw) => {
    const m = JSON.parse(raw);
    if (m.id === id) {
      clearTimeout(timer);
      ws.off('message', on);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  ws.on('message', on);
  ws.send(JSON.stringify({ id, method, params }));
});

const navigate = (tab, url) => new Promise((res, rej) => {
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const id = Math.floor(Math.random() * 1e9);
  const timer = setTimeout(() => rej(new Error('导航超时')), 20000);
  ws.on('open', () => ws.send(JSON.stringify({ id, method: 'Page.navigate', params: { url } })));
  const on = (raw) => {
    const m = JSON.parse(raw);
    if (m.id === id) { clearTimeout(timer); ws.off('message', on); ws.close(); res(); }
  };
  ws.on('message', on);
});

(async () => {
  const dir = path.join(os.tmpdir(), 'edge-img-' + process.pid);
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + dir,
    'about:blank'
  ], { detached: true, stdio: 'ignore' });
  child.unref();

  let bad = 0;
  try {
    await wait();
    const tab = (await httpGet('/json/list')).find((x) => x.type === 'page');

    for (const w of WIDTHS) {
      console.log('\n=== ' + w + 'px ===');

      for (const p of PAGES) {
        await navigate(tab, ORIGIN + p + '?imgcheck=' + Date.now());
        await new Promise((r) => setTimeout(r, 900));

        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        await new Promise((r) => ws.on('open', r));
        await rpc(ws)('Emulation.setDeviceMetricsOverride', {
          width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700
        });
        await new Promise((r) => setTimeout(r, 1400));

        const out = (await rpc(ws)('Runtime.evaluate', {
          expression: PROBE, returnByValue: true
        })).result.value;
        ws.close();

        if (!out.bad.length) {
          console.log('  ' + p.padEnd(52) + out.all + ' 图 OK');
        } else {
          bad++;
          console.log('  ' + p.padEnd(52) + out.bad.length + '/' + out.all + ' 图有问题');
          out.bad.slice(0, 3).forEach((b) => {
            console.log('      ' + String(b.w) + '×' + b.h
              + (b.nat ? ' (原图 ' + b.nat + ')' : '')
              + '  ' + b.why + '  ' + b.src);
          });
          if (out.bad.length > 3) console.log('      … 另有 ' + (out.bad.length - 3) + ' 处');
        }
      }
    }

    console.log('\n' + (bad
      ? bad + ' 个页面/宽度组合有图片适配问题。'
      : '全部页面在各宽度下图片均正常。'));
    process.exitCode = bad ? 1 : 0;
  } catch (e) {
    console.error('失败:', e.message);
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
})();