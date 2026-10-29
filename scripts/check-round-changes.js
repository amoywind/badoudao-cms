/* What this round changed, asked of the live site.

   One: the product page must not have a full-screen viewer, and the
   photograph must not be clickable into one.

   Two: the home page must not have a second row of product photographs
   under the material cards, and the material grid must carry eight
   families.

   Three: on the factory page the two pictures in the right-hand column
   must be the same size, and the two columns must stand at the same
   height.
 */

const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const PDP = 'https://www.oemwallclocks.com/products/plastic-wall-clocks/vintage-moving-gear-wall-clock-with-silent-movement';

(async () => {
  const port = 9945;
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'chk' + port)}`],
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

  for (const w of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride',
      { width: w, height: 1000, deviceScaleFactor: 1, mobile: w < 500 });

    console.log('\n########## ' + w + 'px ##########');

    /* ---- the product page ---- */
    await send('Page.navigate', { url: PDP + '?v=' + Date.now() });
    await new Promise(r => setTimeout(r, 7000));
    console.log('--- PDP ---');
    console.log(await ev(`(function () {
      var de = document.documentElement;
      var main = document.querySelector('.pd-main');
      /* Click the picture and see whether anything appears over the page. */
      var btn = document.querySelector('.pd-main-btn');
      if (btn) btn.click();
      return JSON.stringify({
        lightbox: !!document.querySelector('.pd-lightbox'),
        mainIsButton: main ? main.querySelector('button') !== null : null,
        cursor: btn ? getComputedStyle(btn).cursor : null,
        hint: (document.querySelector('.pd-zoom-hint') || {}).innerText || null,
        galleryImgs: document.querySelectorAll('.pd-gallery img').length,
        overflow: de.scrollWidth - de.clientWidth
      });
    })()`));

    /* ---- the home page ---- */
    await send('Page.navigate', { url: 'https://www.oemwallclocks.com/?v=' + Date.now() });
    await new Promise(r => setTimeout(r, 7000));
    console.log('--- home ---');
    console.log(await ev(`(function () {
      var de = document.documentElement;
      var grid = document.querySelector('.mat-grid');
      var cards = grid ? [].slice.call(grid.querySelectorAll('.mat-card')) : [];
      var names = cards.map(function (c) {
        var h = c.querySelector('h3');
        return h ? h.innerText.trim() : '';
      });
      return JSON.stringify({
        featuredRow: !!document.querySelector('.feat-grid'),
        matCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
        matCount: cards.length,
        names: names,
        /* the picture in each material card — the same photograph appearing
           in two rows was the complaint, so count distinct sources */
        distinctPics: (function () {
          var set = {};
          document.querySelectorAll('.mat-card img').forEach(function (i) {
            set[i.getAttribute('src')] = 1;
          });
          return Object.keys(set).length;
        })(),
        overflow: de.scrollWidth - de.clientWidth
      });
    })()`));

    /* ---- the factory page ---- */
    await send('Page.navigate', { url: 'https://www.oemwallclocks.com/about-us?v=' + Date.now() });
    await new Promise(r => setTimeout(r, 7000));
    console.log('--- about-us ---');
    console.log(await ev(`(function () {
      var de = document.documentElement;
      var sp = document.querySelector('main .split');
      var cols = [];
      if (sp) {
        [].slice.call(sp.children).forEach(function (c) {
          var r = c.getBoundingClientRect();
          cols.push({ w: Math.round(r.width), h: Math.round(r.height) });
        });
      }
      var pics = [].slice.call(document.querySelectorAll('.factory-pic')).map(function (p) {
        var r = p.getBoundingClientRect();
        var i = p.querySelector('img');
        var ir = i ? i.getBoundingClientRect() : null;
        return {
          box: Math.round(r.width) + 'x' + Math.round(r.height),
          img: ir ? Math.round(ir.width) + 'x' + Math.round(ir.height) : null,
          fit: i ? getComputedStyle(i).objectFit : null
        };
      });
      var facts = [].slice.call(document.querySelectorAll('.fact-row')).map(function (f) {
        var k = f.querySelector('.fact-k'), v = f.querySelector('.fact-v');
        return (k ? k.innerText : '') + ': ' + (v ? v.innerText : '');
      });
      return JSON.stringify({
        cols: cols,
        diff: cols.length > 1 ? cols[0].h - cols[1].h : null,
        pics: pics,
        facts: facts,
        overflow: de.scrollWidth - de.clientWidth
      });
    })()`));
  }

  ws.close();
  try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
