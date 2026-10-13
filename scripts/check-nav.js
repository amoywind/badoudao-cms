/**
 * Check that the navigation is actually visible at each breakpoint.
 *
 * Written after a <details>-based mobile menu removed the entire desktop
 * header: the markup was valid, the build was clean, tsc passed, and the
 * layout measured zero overflow at every width — while the nav was simply
 * not there. Every check that looks at geometry missed it, because a
 * missing element overflows nothing.
 *
 * So this asserts on what is rendered: the nav's box, its links, whether
 * they are inside the viewport, and whether they are actually painted
 * (a zero-size or clipped box is not a link a buyer can click).
 *
 *   node scripts/check-nav.js [width]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';
const WIDTHS = (process.argv[2] || '390,820,1440').split(',').map(Number);
const PORT = 9355;
const PAGE = process.argv[3] || '/';

const profile = path.join(os.tmpdir(), `navcheck-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getJSON = (u) => new Promise((resolve, reject) => {
  http.get(u, (res) => {
    let b = '';
    res.on('data', (c) => (b += c));
    res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
  }).on('error', reject);
});

/* What a buyer needs: the menu present, its links laid out inside the
   viewport, and painted. Anything zero-sized or fully clipped counts as
   absent, which is what a closed <details> looks like. */
const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const nav = document.querySelector('.nav');
  const menu = document.querySelector('.menu');
  const logo = document.querySelector('.logo');
  const out = { vw, nav: null, logo: null, links: [], toggle: null };

  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      l: Math.round(r.left), t: Math.round(r.top),
      display: cs.display, visibility: cs.visibility,
      contentVisibility: cs.contentVisibility
    };
  };

  out.nav = box(nav);
  out.logo = box(logo);
  out.toggle = box(document.querySelector('.nav-toggle'));

  document.querySelectorAll('.menu a').forEach(a => {
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    out.links.push({
      text: (a.textContent || '').trim().slice(0, 18),
      w: Math.round(r.width), h: Math.round(r.height),
      l: Math.round(r.left), r: Math.round(r.right),
      display: cs.display
    });
  });

  return JSON.stringify(out);
})()`;

(async () => {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
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
  if (!target) { console.log('无法连接 Edge'); process.exit(2); }

  let WebSocket;
  try { WebSocket = require('ws'); }
  catch { console.log('需要 ws 模块'); process.exit(2); }

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
  await send('Page.enable');

  let failures = 0;

  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700
    });
    await send('Page.navigate', { url: `${HOST}${PAGE}?cb=${Date.now()}` });
    await sleep(2600);

    const res = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const raw = res.result?.result?.value;
    if (!raw) { console.log(`${w}px  测量失败`); failures++; continue; }

    const d = JSON.parse(raw);
    const navOk = d.nav && d.nav.w > 100 && d.nav.h > 10;
    const logoOk = d.logo && d.logo.w > 40 && d.logo.h > 10;
    const visibleLinks = d.links.filter(
      (l) => l.display !== 'none' && l.w > 5 && l.h > 5 && l.l >= -1 && l.r <= w + 1
    );
    const collapsed = w <= 600;

    /* On a phone the menu is collapsed on purpose, so the requirement is
       the toggle, not the links. On anything wider it is the reverse. */
    const ok = navOk && logoOk && (collapsed ? (d.toggle && d.toggle.w > 20) : visibleLinks.length >= 4);

    if (!ok) failures++;

    console.log(`\n${w}px  ${collapsed ? '(手机：折叠态)' : '(需完整导航)'}`);
    console.log(`  ${navOk ? 'OK' : 'NG'} .nav 存在且有尺寸${d.nav ? ` ${d.nav.w}x${d.nav.h}` : ''}`);
    console.log(`  ${logoOk ? 'OK' : 'NG'} .logo 可见${d.logo ? ` ${d.logo.w}x${d.logo.h}` : ''}`);
    if (collapsed) {
      console.log(`  ${d.toggle && d.toggle.w > 20 ? 'OK' : 'NG'} 菜单开关可见${d.toggle ? ` ${d.toggle.w}x${d.toggle.h}` : ''}`);
      console.log(`      链接在折叠状态（${d.links.length} 个在 DOM 中）`);
    } else {
      console.log(`  ${visibleLinks.length >= 4 ? 'OK' : 'NG'} 可见链接 ${visibleLinks.length}/${d.links.length}`);
      if (visibleLinks.length) {
        console.log('      ' + visibleLinks.map((l) => l.text).join(' | '));
      }
    }
  }

  try { process.kill(-edge.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  console.log(failures === 0 ? '\n导航在三档宽度都正常。' : `\n${failures} 档宽度有问题。`);
  process.exit(failures === 0 ? 0 : 1);
})();