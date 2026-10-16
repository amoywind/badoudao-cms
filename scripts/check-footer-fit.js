/**
 * Measure the footer link columns at real phone widths.
 *
 *   node scripts/check-footer-fit.js
 *
 * "Glass & Crystal Wall Clock" is 26 characters in a column that is a
 * fraction of a phone's width. Whether that overflows depends on whether
 * the anchor is allowed to wrap and whether the flex item can shrink —
 * neither is visible in the markup, and a screenshot of a phone-width page
 * in headless Edge is cropped rather than narrow (see check-overflow.js),
 * so it cannot answer this either.
 *
 * This asks the browser: for each footer link, does its box exceed the
 * width of its column?
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
const PORT = 9455;
const WIDTHS = (process.env.W || '390,320,768,1024').split(',').map(Number);

const PAGES = ['/', '/products', '/contact', '/articles'];

const PROBE = `(() => {
  const out = [];
  document.querySelectorAll('.f-list').forEach((list) => {
    const colW = list.getBoundingClientRect().width;
    const head = list.previousElementSibling;
    const title = head ? head.textContent.trim() : '?';
    list.querySelectorAll('a').forEach((a) => {
      const r = a.getBoundingClientRect();
      const lines = Math.round(r.height / (parseFloat(getComputedStyle(a).lineHeight) || 20));
      /* Wrapping is not a fault. "Glass & Crystal Wall Clock" is 26
         characters and needs about 175px at 13.5px type; no column
         narrower than that can hold it on one line, and a footer link on
         two lines looks like a footer link on two lines. Three lines means
         the column is too narrow to read, and a link wider than its own
         column is the real failure. */
      if (r.width > colW + 1 || lines >= 3) {
        out.push(title + ' | "' + a.textContent.trim() + '" | col=' + Math.round(colW)
          + ' link=' + Math.round(r.width) + ' lines=' + lines);
      }
    });
  });
  return out.length ? out.join('\\n') : 'CLEAN';
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

let _ws = null;
const rpc0 = (tab, method, params) => {
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  return new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 1e9);
    const timer = setTimeout(() => rej(new Error('navigate 超时')), 15000);
    ws.on('open', () => ws.send(JSON.stringify({ id, method, params })));
    const on = (raw) => {
      const m = JSON.parse(raw);
      if (m.id === id) { clearTimeout(timer); ws.off('message', on); ws.close();
        m.error ? rej(new Error(m.error.message)) : res(m.result); }
    };
    ws.on('message', on);
  });
};

const rpc = (ws) => (method, params) => new Promise((res, rej) => {
  const id = Math.floor(Math.random() * 1e9);
  const timer = setTimeout(() => rej(new Error('CDP 超时')), 15000);
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

(async () => {
  const dir = path.join(os.tmpdir(), 'edge-ff-' + process.pid);
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
    for (const w of WIDTHS) {
      console.log('\n=== ' + w + 'px ===');
      for (const p of PAGES) {
        /* /json/new answered with a warning page on some Edge builds, so
           the tab that is already open is navigated instead. */
        const list = await httpGet('/json/list');
        const tab = list.find((x) => x.type === 'page');
        await rpc0(tab, 'Page.navigate', { url: ORIGIN + p });
        const t = tab;

        const ws = new WebSocket(t.webSocketDebuggerUrl);
        await new Promise((r) => ws.on('open', r));
        await rpc(ws)('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700 });
        await new Promise((r) => setTimeout(r, 1100));

        const out = (await rpc(ws)('Runtime.evaluate', { expression: PROBE, returnByValue: true })).result.value;
        ws.close();

        if (out === 'CLEAN') {
          console.log('  ' + p.padEnd(12) + 'OK');
        } else {
          bad++;
          console.log('  ' + p.padEnd(12) + '→ ' + out.split('\n').length + ' 处异常');
          out.split('\n').slice(0, 4).forEach((l) => console.log('      ' + l));
        }
      }
    }
    console.log('\n' + (bad ? bad + ' 个页面在某个宽度下有问题。' : '全部页面在各宽度下均正常。'));
    process.exitCode = bad ? 1 : 0;
  } catch (e) {
    console.error('失败:', e.message);
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
})();