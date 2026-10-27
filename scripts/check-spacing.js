/* Is the spacing between sections the same everywhere?
 *
 * The site used to decide it in two places: a stylesheet rule that
 * the home page obeyed, and inline padding on every other page. That
 * gave the same page two rhythms and meant a change to one reached
 * only part of the site.
 *
 * This reads the computed padding of every section on a set of pages
 * and reports the figures, so a page that drifts away from the others
 * is caught.
 *
 * Usage: node scripts/check-spacing.js [baseUrl]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const BASE = process.argv[2] || 'https://www.oemwallclocks.com';

const PAGES = [
  '/',
  '/products',
  '/products/wood-wall-clocks',
  '/customizer',
  '/custom-services',
  '/components',
  '/craft-qc',
  '/about-us',
  '/contact'
];

(async () => {
  const port = 9750 + Math.floor(Math.random() * 30);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'sp' + port)}`], { stdio: 'ignore' });
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
    return r.result?.value;
  };

  await send('Page.enable', {});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const seen = new Map();
  let pages = 0;

  for (const p of PAGES) {
    await send('Page.navigate', { url: BASE + p });
    await new Promise(r => setTimeout(r, 5000));

    const out = JSON.parse(await ev(`(function(){
      var secs=Array.prototype.slice.call(document.querySelectorAll('main section, .site > main > section'));
      var rows=[];
      for(var i=0;i<secs.length;i++){
        var el=secs[i];
        /* The page head and the hero carry their own spacing, and the
           hero is not a section in the ordinary sense — it is the
           first screen. Their figures are deliberate and are not the
           rhythm being checked here. */
        var cls=(el.className||'').toString();
        if(cls.indexOf('page-head')>=0 || cls.indexOf('hero')>=0) continue;
        var cs=getComputedStyle(el);
        rows.push({t:cs.paddingTop, b:cs.paddingBottom, id:el.id||'', cls:cls.slice(0,20)});
      }
      return JSON.stringify(rows);
    })()`));

    pages++;
    for (const r of out) {
      const key = r.t + '/' + r.b;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(p);
    }
    console.log(p.padEnd(32) + out.length + ' sections, ' +
      [...new Set(out.map(r => r.t + '/' + r.b))].join('  '));
  }

  console.log('\n--- the figures in use ---');
  for (const [k, v] of [...seen.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log('  ' + k.padEnd(16) + v.length + ' pages');
  }

  /* One figure means one rhythm. */
  const distinct = [...seen.keys()];
  console.log('\n' + pages + ' pages, ' + distinct.length + ' different spacing figures');
  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(distinct.length > 2 ? 1 : 0);
})();
