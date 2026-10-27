/**
 * Report every element on every page that is wider than the viewport.
 *
 *   node scripts/check-wide.js [width]
 *
 * This is the check that was missing. check-overflow.js asks whether the
 * document scrolls sideways, and an oversized image inside
 * overflow: hidden does not make the document scroll — the page is simply
 * wrong, and every previous check called it fine.
 *
 * So this walks every element rather than the document, and reports any box
 * whose right edge passes the viewport, with its ancestor chain so the
 * culprit is named. It found a 996px product photo inside a 390px phone,
 * caused by a grid item that would not shrink, on the two pages that use
 * the sidebar-and-grid layout.
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
const PORT = 9468;
const WIDTH = Number(process.argv[2] || 390);

const PAGES = [
  '/', '/products', '/products/wall-clocks', '/products/metal-wall-clocks',
  '/products/resin-wall-clocks', '/products/acrylic-wall-clocks',
  '/products/glass-crystal-wall-clocks',
  '/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock',
  '/articles', '/news', '/contact',
  '/p/factory', '/p/quality', '/p/certification', '/p/oem-odm', '/p/small-batch'
];

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const hits = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    if (r.right <= vw + 1 && r.width <= vw + 1) return;

    /* Report the outermost offender in each chain, not every descendant:
       a card being wide because its parent is wide is one fault, not ten. */
    let deepest = true;
    const p = el.parentElement;
    if (p) {
      const pr = p.getBoundingClientRect();
      if (pr.width > vw + 1) deepest = false;
    }
    if (!deepest) return;

    /* Skip anything inside a deliberate horizontal scroller. The category
       filter on a phone is a row of pills you swipe sideways — the items
       are meant to be wider than the screen, and the ul that holds them
       carries overflow-x: auto. The same applies to a table with its own
       scroller. Content that overflows where nothing asked it to is the
       fault; content that overflows inside a scroller is the design. */
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll') return;
    }

    const cls = (typeof el.className === 'string' ? el.className : '')
      .trim().split(/\\s+/).slice(0, 2).join('.');
    const chain = [];
    let up = el;
    for (let i = 0; i < 4 && up; i++) {
      const c = (typeof up.className === 'string' ? up.className : '')
        .trim().split(/\\s+/)[0];
      chain.push(up.tagName.toLowerCase() + (c ? '.' + c : ''));
      up = up.parentElement;
    }
    hits.push({
      w: Math.round(r.width),
      right: Math.round(r.right),
      sel: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
      chain: chain.join(' < ')
    });
  });
  return { vw, hits: hits.slice(0, 6), total: hits.length };
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

(async () => {
  const dir = path.join(os.tmpdir(), 'edge-wide-' + process.pid);
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + dir,
    '--window-size=1280,900',
    'about:blank'
  ], { detached: true, stdio: 'ignore' });
  child.unref();

  let bad = 0;
  try {
    await wait();
    const tab = (await httpGet('/json/list')).find((x) => x.type === 'page');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r) => ws.on('open', r));

    let id = 0;
    const rpc = (m, p) => new Promise((res, rej) => {
      const n = ++id;
      const t = setTimeout(() => rej(new Error('CDP 超时')), 25000);
      const on = (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id === n) {
          clearTimeout(t); ws.off('message', on);
          msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
        }
      };
      ws.on('message', on);
      ws.send(JSON.stringify({ id: n, method: m, params: p }));
    });

    await rpc('Page.enable');
    await rpc('Emulation.setDeviceMetricsOverride', {
      width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: WIDTH < 700,
      screenWidth: WIDTH, screenHeight: 844
    });

    console.log('超宽元素检查 @ ' + WIDTH + 'px\n');

    for (const p of PAGES) {
      const loaded = new Promise((res) => {
        const on = (raw) => {
          if (JSON.parse(raw).method === 'Page.loadEventFired') { ws.off('message', on); res(); }
        };
        ws.on('message', on);
      });
      await rpc('Page.navigate', { url: ORIGIN + p + '?wide=' + Date.now() });
      await Promise.race([loaded, new Promise((r) => setTimeout(r, 20000))]);
      await new Promise((r) => setTimeout(r, 1600));

      /* The reading walks every element on the page, and on a heavy
         page that can take long enough to look like a hang. It gets a
         limit of its own, and the page is reported as unread rather
         than stalling the whole run. */
      const out = await Promise.race([
        rpc('Runtime.evaluate', { expression: PROBE, returnByValue: true })
          .then(r => r.result.value),
        new Promise(res => setTimeout(() => res({ total: -1, hits: [] }), 15000))
      ]);

      if (out.total < 0) {
        console.log('  ' + p.padEnd(56) + '读取超时，未检查');
        continue;
      }
      if (!out.total) {
        console.log('  ' + p.padEnd(56) + 'OK');
      } else {
        bad++;
        console.log('  ' + p.padEnd(56) + out.total + ' 处超宽');
        out.hits.forEach((h) => {
          console.log('      ' + String(h.w).padStart(5) + 'px  ' + h.sel);
          console.log('              ' + h.chain);
        });
        if (out.total > out.hits.length) {
          console.log('      … 另有 ' + (out.total - out.hits.length) + ' 处');
        }
      }
    }

    console.log('\n' + (bad ? bad + ' 个页面有超宽元素。' : '全部页面在 ' + WIDTH + 'px 下无超宽元素。'));
    process.exitCode = bad ? 1 : 0;
  } catch (e) {
    console.error('失败:', e.message);
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
})();