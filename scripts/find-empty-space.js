/**
 * Find what occupies the empty half of a page.
 *
 * A content column that stops halfway across a wide screen looks like a
 * layout bug and often is not: the text is inside a container with a
 * measure, or a sibling is reserving space it does not fill. Reading the
 * CSS cannot tell those apart, so this asks the browser for the boxes at
 * that width.
 *
 *   node scripts/find-empty-space.js [url] [width]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9388;
const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/p/small-batch';
const WIDTH = parseInt(process.argv[3] || '1440', 10);

const profile = path.join(os.tmpdir(), `empty-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => {
  http.get(u, (r) => {
    let b = '';
    r.on('data', (c) => (b += c));
    r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, blocks: [] };

  /* Walk the elements that define the page's horizontal structure. */
  document.querySelectorAll('.wrap, .content-block, .quality-layout, .split, .pd, .page-head, section, main').forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width < 50 || r.height < 20) return;
    out.blocks.push({
      sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').filter(Boolean).join('.') : ''),
      l: Math.round(r.left), r: Math.round(r.right),
      w: Math.round(r.width),
      display: cs.display,
      gridCols: cs.gridTemplateColumns,
      maxWidth: cs.maxWidth,
      text: (el.textContent || '').trim().length
    });
  });

  /* The widest line of text inside the content, which is the measure a
     reader actually sees. */
  const cb = document.querySelector('.content-block');
  if (cb) {
    const r = cb.getBoundingClientRect();
    let maxRight = 0, minLeft = r.left;
    cb.querySelectorAll('*').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.width < 20 || b.height < 6) return;
      if (b.right > maxRight) maxRight = b.right;
      if (b.left < minLeft) minLeft = b.left;
    });
    out.content = {
      boxLeft: Math.round(r.left), boxRight: Math.round(r.right),
      boxWidth: Math.round(r.width),
      inkLeft: Math.round(minLeft), inkRight: Math.round(maxRight),
      inkWidth: Math.round(maxRight - minLeft)
    };
  }

  return JSON.stringify(out);
})()`;

(async () => {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, `--window-size=${WIDTH},900`, URL_
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
  if (!target) { console.log('无法连接浏览器'); process.exit(2); }

  const WebSocket = require('ws');
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((res) => {
    const n = ++id; pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  await new Promise((r) => ws.on('open', r));
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 700
  });
  await send('Page.enable');
  await send('Page.navigate', { url: URL_ });
  await sleep(3000);

  const res = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const raw = res.result?.result?.value;

  try { process.kill(-edge.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!raw) { console.log('测量失败'); process.exit(2); }

  const d = JSON.parse(raw);
  console.log(`\n${WIDTH}px   ${URL_}\n`);

  console.log('结构盒:');
  for (const b of d.blocks.slice(0, 14)) {
    console.log(`  ${b.sel.padEnd(34)} ${String(b.l).padStart(5)}→${String(b.r).padStart(5)} 宽${String(b.w).padStart(5)}  ${b.display}${b.gridCols ? ' ' + b.gridCols : ''}${b.maxWidth && b.maxWidth !== 'none' ? ' max-w:' + b.maxWidth : ''}`);
  }

  if (d.content) {
    const c = d.content;
    console.log(`\n正文区:`);
    console.log(`  容器  ${c.boxLeft}→${c.boxRight}  宽 ${c.boxWidth}`);
    console.log(`  文字  ${c.inkLeft}→${c.inkRight}  宽 ${c.inkWidth}`);
    const unused = c.boxRight - c.inkRight;
    console.log(`  容器右侧未被文字占用的宽度: ${unused}px`);
    if (unused > 120) {
      console.log('\n→ 容器比文字宽，说明有列被保留但没内容，或容器有 max-width 而文字没占满。');
    }
  }
})();