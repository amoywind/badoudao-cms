/* Two layout questions, asked of the live site.

   The first: on the factory page, does the business licence sit inside
   the page's margin, and do the two columns stand at the same height?

   The second: on the home page, is the shortlist row drawn at the same
   size as the material grid directly above it?

   Both are read from the rendered page rather than from the source,
   because the source cannot tell you where a thing actually ended up.
 */

const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const port = 9935;
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'lay' + port)}`],
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

    /* ---- the factory page ---- */
    await send('Page.navigate', { url: 'https://www.oemwallclocks.com/about-us?v=' + Date.now() });
    await new Promise(r => setTimeout(r, 7000));
    console.log('\n===== about-us @ ' + w + 'px =====');
    console.log(await ev(`(function () {
      var sp = document.querySelector('main .split');
      if (!sp) return 'no split';
      var ch = sp.children;
      var cols = [];
      for (var i = 0; i < ch.length; i++) {
        var r = ch[i].getBoundingClientRect();
        cols.push({ w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left) });
      }

      /* The licence card, and whether it is inside the page's margin. */
      var lic = null;
      var cards = [].slice.call(document.querySelectorAll('main .card'));
      for (var j = 0; j < cards.length; j++) {
        if (/Business licence/i.test(cards[j].innerText)) { lic = cards[j]; break; }
      }
      var wrap = document.querySelector('main .wrap');
      var wr = wrap ? wrap.getBoundingClientRect() : null;

      var de = document.documentElement;
      return JSON.stringify({
        cols: cols,
        diff: cols.length > 1 ? cols[0].h - cols[1].h : null,
        licence: lic ? {
          left: Math.round(lic.getBoundingClientRect().left),
          insideWrap: wr ? lic.getBoundingClientRect().left >= wr.left - 1 : null,
          imgH: lic.querySelector('img') ? Math.round(lic.querySelector('img').getBoundingClientRect().height) : null
        } : 'not found',
        wrapLeft: wr ? Math.round(wr.left) : null,
        overflow: de.scrollWidth - de.clientWidth
      });
    })()`));

    /* ---- the home page ---- */
    await send('Page.navigate', { url: 'https://www.oemwallclocks.com/?v=' + Date.now() });
    await new Promise(r => setTimeout(r, 7000));
    console.log('===== home @ ' + w + 'px =====');
    console.log(await ev(`(function () {
      function grid(sel, cardSel) {
        var g = document.querySelector(sel);
        if (!g) return null;
        var cs = getComputedStyle(g);
        var c = g.querySelector(cardSel);
        var sq = c ? c.querySelector('.sq') : null;
        return {
          cols: cs.gridTemplateColumns.split(' ').length,
          cardW: c ? Math.round(c.getBoundingClientRect().width) : null,
          imgW: sq ? Math.round(sq.getBoundingClientRect().width) : null
        };
      }
      var de = document.documentElement;
      var feat = [].slice.call(document.querySelectorAll('.feat-card')).map(function (c) {
        return (c.querySelector('.feat-sku') || {}).innerText;
      });
      return JSON.stringify({
        mat: grid('.mat-grid', '.mat-card'),
        feat: grid('.feat-grid', '.feat-card'),
        featCount: feat.length,
        skus: feat,
        overflow: de.scrollWidth - de.clientWidth
      });
    })()`));
  }

  ws.close();
  try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
