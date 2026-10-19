/**
 * Measure the real transfer weight of the images on a page.
 *
 * PageSpeed reported 2,234 KB of images on the home page, 1,976 KB of it
 * bytes the layout never displayed. This checks the fix from the other
 * end: it renders the page in a real browser and reports, per image, the
 * URL the browser actually fetched and how many bytes came back.
 *
 * Uses the DevTools protocol the same way measure.js does — no npm
 * dependency, no driver.
 *
 *   node scripts/measure-images.js [page]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';
/* MSYS_NO_PATHCONV: Git Bash rewrites anything that looks like a path, and
   "/products/plastic-wall-clocks/" becomes a Windows path before the script
   ever sees it. Same reason the deploy commands export it. */
const PAGE = process.argv[2] || '/';
const PORT = 9337;

const profile = path.join(os.tmpdir(), `measure-img-${process.pid}`);
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

async function main() {
  const proc = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore', detached: false });

  let targets = null;
  for (let i = 0; i < 40 && !targets; i++) {
    await sleep(400);
    try { targets = await getJSON(`http://127.0.0.1:${PORT}/json/list`); } catch { /* not up */ }
  }
  if (!targets) { proc.kill(); throw new Error('Edge did not expose the debugging port'); }

  const page = targets.find((t) => t.type === 'page');
  const ws = page.webSocketDebuggerUrl;
  const WebSocket = require('ws');
  const sock = new WebSocket(ws, { perMessageDeflate: false });

  let id = 0;
  const pending = new Map();
  /* Every response the page makes, so the byte count comes from the network
     rather than from the DOM. */
  const seen = new Map();

  const send = (method, params) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    sock.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise((r) => sock.on('open', r));

  sock.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Network.responseReceived') {
      const { requestId, response } = msg.params;
      seen.set(requestId, { url: response.url, type: response.mimeType, len: 0 });
    }
    if (msg.method === 'Network.loadingFinished') {
      const rec = seen.get(msg.params.requestId);
      if (rec) rec.len = msg.params.encodedDataLength;
    }
  });

  await send('Network.enable');
  await send('Page.enable');
  /* A real phone: the numbers that matter are the ones a buyer on 4G sees. */
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, mobile: true, deviceScaleFactor: 2
  });
  await send('Page.navigate', { url: HOST + PAGE });
  await sleep(4000);

  /* Scroll the whole page so the lazy-loaded images actually request.
     Without this the measurement only covers the first screenful, and the
     number it reports is the one that looked fine before the fix. */
  await send('Runtime.evaluate', {
    expression: `(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 350));
      }
      window.scrollTo(0, 0);
    })()`,
    awaitPromise: true
  });
  await sleep(3500);

  const imgs = await send('Runtime.evaluate', {
    expression: `JSON.stringify(Array.from(document.images).map(i => ({
      src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight,
      dw: Math.round(i.getBoundingClientRect().width)
    })))`,
    returnByValue: true
  });

  const dom = JSON.parse(imgs.result.value);
  /* Matched on the URL the browser fetched, which is what the buyer pays
     for. `currentSrc` is the resolved candidate — with srcset it may differ
     from the src attribute, and it is the resolved one that got downloaded. */
  const rows = dom.map((d) => {
    const net = [...seen.values()].find((s) => s.url === d.src);
    return { ...d, bytes: net ? net.len : 0 };
  }).filter((r) => r.src.startsWith('http') && r.w > 0);

  console.log(`\n${PAGE}  (390px 视口, DPR 2)\n`);
  let total = 0;
  let thumbCount = 0;
  rows.forEach((r) => {
    total += r.bytes;
    const isThumb = r.src.includes('media-thumb');
    if (isThumb) thumbCount++;
    const kb = (r.bytes / 1024).toFixed(1);
    const kind = isThumb ? 'thumb' : '原图  ';
    console.log(
      `  ${kb.padStart(8)} KB  ${kind}  ${r.w}x${r.h} → ${r.dw}px  ${r.src.replace(HOST, '')}`
    );
  });
  console.log(
    `\n  图片合计：${(total / 1024).toFixed(1)} KB` +
    `（${rows.length} 张，其中缩略图 ${thumbCount} 张）\n`
  );

  sock.close();
  proc.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
}

main().catch((e) => { console.error('错误：', e.message); process.exit(1); });