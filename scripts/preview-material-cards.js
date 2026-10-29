/**
 * Previews a change to the material cards on the live site.
 *
 * The local preview database holds no products, so a material card
 * cannot be seen locally at all. Injecting the stylesheet into the
 * live page shows the real thing: real photographs, the real text, the
 * real measurements.
 *
 * Run: node scripts/preview-material-cards.js <css-file> <out.png> [width] [cols]
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const cssFile = process.argv[2];
  const out = process.argv[3];
  const width = Number(process.argv[4] || 1440);
  const cols = process.argv[5] || '';
  const css = fs.readFileSync(cssFile, 'utf8');

  const port = 9997;
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(os.tmpdir(), 'pv' + port)}`], { stdio: 'ignore' });

  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const l = await r.json();
      const p = l.find((t) => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  let id = 0;
  const send = (m, p) => new Promise((res, rej) => {
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: ++id, method: m, params: p }));
  });
  const ev = async (e) =>
    (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

  await send('Page.enable', {});
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: 1100, deviceScaleFactor: 1, mobile: width < 500
  });
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/?v=' + Date.now() });
  await new Promise((r) => setTimeout(r, 8000));

  await ev(`(function(){
    var st = document.createElement('style');
    st.textContent = ${JSON.stringify(css)};
    document.head.appendChild(st);
    return 1;
  })()`);
  await new Promise((r) => setTimeout(r, 700));

  const measure = await ev(`(function(){
    var g = document.querySelector('.mat-grid');
    var cards = [].slice.call(document.querySelectorAll('.mat-card'));
    var c = cards[0], sq = c.querySelector('.sq'), img = sq.querySelector('img');
    function R(el){ if(!el) return null; var r = el.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}; }
    var gr = g.getBoundingClientRect();
    var sec = document.querySelector('#materials');
    return JSON.stringify({
      cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
      gridH: Math.round(gr.height),
      card: R(c), sq: R(sq),
      sectionH: sec ? Math.round(sec.getBoundingClientRect().height) : null,
      imgOk: img ? (img.naturalWidth > 0) : null
    });
  })()`);
  console.log(measure);

  await ev(`(function(){ var e = document.querySelector('#materials'); if (e) e.scrollIntoView({block:'start'}); return new Promise(function(r){setTimeout(r,900);}); })()`);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
  console.log('saved ' + out);

  ws.close();
  try { process.kill(proc.pid); } catch {}
  setTimeout(() => process.exit(0), 600);
  process.exit(0);
})();
