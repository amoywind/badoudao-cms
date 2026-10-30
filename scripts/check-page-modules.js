/* What each public page is actually made of.

   The plan in the specification document lists the modules a page
   should have. This asks the rendered page what sections it has,
   and what each one is called, so the two can be put side by side.

   It reads the live site, so it reports what a buyer would get —
   not what the source says was intended. */

const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const HOST = process.env.BASE || 'https://www.oemwallclocks.com';

const PAGES = [
  ['/', 'Home'],
  ['/custom-services', 'Custom Services'],
  ['/products', 'Products Directory'],
  ['/products/wood-wall-clocks', 'Product Category'],
  ['/components', 'Components Studio'],
  ['/craft-qc', 'Craft & QC'],
  ['/about-us', 'About Us'],
  ['/contact', 'Contact'],
  ['/customizer', 'Customizer'],
  ['/articles', 'Articles'],
  ['/news', 'News']
];

/* A section is named by the kicker above it, or by its heading. */
const PROBE = `(function () {
  var out = [];
  var secs = [].slice.call(document.querySelectorAll('main > section, main > div > section'));

  secs.forEach(function (s) {
    var tag = s.querySelector('.sec-tag, .kicker, .eyebrow');
    var h = s.querySelector('h1, h2, h3');
    var label = tag ? tag.innerText.trim() : (h ? h.innerText.trim() : '');
    if (label.length > 58) label = label.slice(0, 58) + '…';

    /* What is inside it — the modules a reader would see. */
    var marks = [];
    if (s.querySelector('.trust-card, .tcards .tcard')) marks.push('trust-cards');
    if (s.querySelector('.clockbox, .live-clock, .lc-wrap')) marks.push('live-clock');
    if (s.querySelector('.anx-svg, .anx-diagram')) marks.push('anatomy');
    if (s.querySelector('.qc-grid, .qc-item')) marks.push('qc-steps');
    if (s.querySelector('.cert-row, .cert-list')) marks.push('cert-strip');
    if (s.querySelector('video, .vslot')) marks.push('video');
    if (s.querySelector('.pgrid, .pcard')) marks.push('product-grid');
    if (s.querySelector('.grid-3, .grid-2, .grid-4')) marks.push('card-grid');
    if (s.querySelector('form')) marks.push('form');
    if (s.querySelector('.cap-list, .timeline, .route')) marks.push('timeline');
    if (s.querySelector('table')) marks.push('table');
    if (s.querySelector('.tabs, [role=tablist], .tabbar')) marks.push('tabs');
    if (s.querySelector('.inq-cta, .cta-band')) marks.push('cta-band');

    var h2 = s.querySelector('h2');
    out.push({
      label: label,
      heading: h2 ? h2.innerText.trim().replace(/\\s+/g, ' ').slice(0, 62) : null,
      marks: marks.join(',')
    });
  });

  return JSON.stringify({
    h1: (document.querySelector('main h1') || {}).innerText || null,
    sections: out,
    /* Modules that live outside a section, and the repeated furniture. */
    trustCards: document.querySelectorAll('.trust-card, .tcards .tcard').length,
    videos: document.querySelectorAll('main video, main .vslot').length,
    forms: document.querySelectorAll('main form').length,
    tables: document.querySelectorAll('main table').length
  });
})()`;

(async () => {
  const port = 9311;
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'mod' + port)}`],
    { stdio: 'ignore' });

  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const l = await r.json();
      const p = l.find(t => t.type === 'page');
      if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  let id = 0;
  const send = (m, p) => new Promise((res, rej) => {
    const hh = (raw) => {
      const m2 = JSON.parse(raw.toString());
      if (m2.id === id) { ws.off('message', hh); m2.error ? rej(new Error(m2.error.message)) : res(m2.result); }
    };
    ws.on('message', hh);
    ws.send(JSON.stringify({ id: ++id, method: m, params: p }));
  });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;

  await send('Page.enable', {});
  await send('Emulation.setDeviceMetricsOverride',
    { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  for (const [url, name] of PAGES) {
    await send('Page.navigate', { url: HOST + url + '?v=' + Date.now() });
    await new Promise(r => setTimeout(r, 6500));
    const raw = await ev(PROBE);
    let d;
    try { d = JSON.parse(raw); } catch { d = { error: raw }; }
    console.log('\n===== ' + name + '  (' + url + ') =====');
    if (d.error) { console.log('  ' + d.error); continue; }
    console.log('  H1: ' + (d.h1 || '—').replace(/\s+/g, ' '));
    console.log('  重复件: trust=' + d.trustCards + ' video=' + d.videos + ' form=' + d.forms + ' table=' + d.tables);
    (d.sections || []).forEach((s, i) => {
      console.log('  ' + String(i + 1).padStart(2) + '. ' + (s.heading || s.label || '(无标题)')
        + (s.marks ? '   [' + s.marks + ']' : ''));
    });
  }

  ws.close();
  try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
