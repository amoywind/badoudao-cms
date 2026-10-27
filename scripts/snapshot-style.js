/* Does the page look the same after the change?
 *
 * The stylesheets were reorganised: the media queries moved to the
 * end of each file. The rules inside them did not change, but order
 * is what decides which of two rules wins, so the only way to be sure
 * is to read what the browser actually computes and compare it with
 * what it computed before.
 *
 * This reads a set of properties from every element that has a class
 * on several pages, and writes them out as a text file. Run it before
 * the change and again after, and the two files are compared.
 *
 * Usage: node scripts/snapshot-style.js <output-file> [baseUrl]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const fs = require('fs');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const OUT = process.argv[2] || 'scripts/.style-before.txt';
const BASE = process.argv[3] || 'https://www.oemwallclocks.com';

const PAGES = [
  '/', '/products', '/products/wood-wall-clocks',
  '/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock',
  '/news', '/articles', '/customizer', '/custom-services',
  '/components', '/craft-qc', '/about-us', '/contact'
];

const WIDTHS = [1440, 1024, 768, 390];

(async () => {
  const port = 9850 + Math.floor(Math.random() * 30);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'st' + port)}`], { stdio: 'ignore' });
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
      const msg = JSON.parse(raw.toString());
      if (msg.id === id) { ws.off('message', hh); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    };
    ws.on('message', hh);
    ws.send(JSON.stringify({ id: ++id, method: m, params: p }));
  });
  const ev = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
    return r.result?.value;
  };

  await send('Page.enable', {});

  /* The properties that decide how a thing looks: its box, its type,
     and its colour. Anything that moved would show up here. */
  const PROPS = [
    'display', 'position', 'width', 'height', 'maxWidth', 'maxHeight',
    'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas',
    'flexDirection', 'flexWrap', 'gap', 'alignItems', 'justifyContent',
    'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
    'color', 'backgroundColor', 'borderTopWidth', 'borderRadius',
    'textAlign', 'textTransform', 'overflow', 'aspectRatio', 'objectFit'
  ].join(',');

  const lines = [];

  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500
    });

    for (const p of PAGES) {
      await send('Page.navigate', { url: BASE + p });
      await new Promise(r => setTimeout(r, 4500));

      /* Wait until the stylesheets have actually arrived.

         A page can be painted before its stylesheet has been applied, and
         a snapshot taken then records the browser's defaults — a
         transparent background, a sixteen-pixel font — which look
         exactly like a page whose styles have been broken. Reading the
         defaults and calling it a difference would be wrong, so the
         wait is for the sheets themselves, not for a fixed number of
         seconds. */
      const ready = await ev(`(function(){
        var sheets = performance.getEntriesByType('resource')
          .filter(function(r){ return r.name.indexOf('.css') >= 0; });
        var pending = sheets.filter(function(r){ return !r.responseEnd; });
        return sheets.length > 0 && pending.length === 0;
      })()`);
      if (!ready) {
        await new Promise(r => setTimeout(r, 4000));
      }
      await new Promise(r => setTimeout(r, 1200));

      const out = await ev(`(function(){
        var PROPS = ${JSON.stringify(PROPS.split(','))};
        var els = document.querySelectorAll('*');
        var rows = [];
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (!el.className || typeof el.className !== 'string') continue;
          var cls = el.className.trim().split(/\\s+/).slice(0,2).join('.');
          if (!cls) continue;
          var cs = getComputedStyle(el);
          var vals = [];
          for (var j = 0; j < PROPS.length; j++) vals.push(cs[PROPS[j]]);
          rows.push(cls + '|' + vals.join('|'));
        }
        return rows.join('\\n');
      })()`);

      lines.push('### ' + w + ' ' + p);
      lines.push(out || '');
    }
  }

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log('written', OUT, fs.statSync(OUT).size, 'bytes');

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
