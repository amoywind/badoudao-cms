/**
 * Screenshot the admin dashboard with a live session cookie.
 *
 * The dashboard is a client component: its markup arrives after the API
 * responses, so fetching the HTML shows the shell and nothing else. The
 * grid and the table only exist once the browser has run the fetches, which
 * is why reading the source and reading the HTML both said "fine" while
 * the page looked wrong.
 *
 * The session token is read from a file rather than prompted for, so this
 * is not something to run casually: it opens an authenticated page.
 *
 *   node scripts/shoot-admin.js <out.png> [width]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9399;
const OUT = process.argv[2] || 'admin.png';
const WIDTH = parseInt(process.argv[3] || '1600', 10);

const tokFile = path.join(__dirname, '.tok');
if (!fs.existsSync(tokFile)) {
  console.log('缺少 scripts/.tok（一个有效的 bd_session 值）');
  process.exit(2);
}
const TOKEN = fs.readFileSync(tokFile, 'utf8').trim();

const profile = path.join(os.tmpdir(), `admin-shot-${process.pid}`);
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
  const grid = document.querySelector('.grid2-wide, .grid2');
  const fixed = document.querySelector('table[data-fixed]');
  const out = { gridClass: grid ? grid.className : '(none)' };

  if (grid) {
    const cs = getComputedStyle(grid);
    const r = grid.getBoundingClientRect();
    out.gridCols = cs.gridTemplateColumns;
    out.gridWidth = Math.round(r.width);
    /* The two children: if the right one is much narrower, the fix landed. */
    const kids = [...grid.children].map((k) => Math.round(k.getBoundingClientRect().width));
    out.childWidths = kids;
  }

  if (fixed) {
    const cs = getComputedStyle(fixed);
    out.tableLayout = cs.tableLayout;
    /* Column boxes: fixed layout puts them at the declared widths. */
    const firstRow = fixed.querySelector('tr');
    out.colWidths = [...firstRow.children].map((c) => Math.round(c.getBoundingClientRect().width));
  }

  /* Confirm the admin is outside the public scope. */
  out.bodyHasSite = document.body.classList.contains('site');
  out.adminRoot = !!document.querySelector('.admin-root');
  out.siteInside = document.querySelectorAll('.admin-root .site').length;

  return JSON.stringify(out);
})()`;

(async () => {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},1200`,
    'https://www.oemwallclocks.com/admin'
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
  await send('Network.enable');
  await send('Network.setCookie', {
    name: 'bd_session', value: TOKEN, domain: 'oemwallclocks.com', path: '/'
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: 1200, deviceScaleFactor: 1, mobile: false
  });
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/admin' });

  /* Long enough for the two API fetches and the render. */
  await sleep(7000);

  const res = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const raw = res.result?.result?.value;

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  if (shot.result?.data) {
    fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
  }

  try { process.kill(-edge.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!raw) { console.log('探测未返回结果'); process.exit(2); }
  const d = JSON.parse(raw);

  console.log('\n=== 后台实测 ===\n');
  console.log('body 带 site 类:', d.bodyHasSite, ' ← 必须是 false');
  console.log('有 admin-root:', d.adminRoot);
  console.log('admin 内嵌 .site:', d.siteInside, ' ← 必须是 0');
  console.log('\n栅格类:', d.gridClass);
  console.log('栅格列定义:', d.gridCols);
  console.log('两栏宽度:', (d.childWidths || []).join(' / '));
  console.log('\n表格 layout:', d.tableLayout || '(无 data-fixed 表格)');
  console.log('各列宽度:', (d.colWidths || []).join(' / '));
  console.log('\n截图:', OUT);

  const ok = d.bodyHasSite === false && d.adminRoot === true && d.siteInside === 0;
  console.log(ok ? '\n作用域正确。' : '\n作用域仍有问题。');
  process.exit(ok ? 0 : 1);
})();