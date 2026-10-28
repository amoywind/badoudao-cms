/* How big is the clickable area of each part of the exploded view?
 *
 * A drawing is not a page: what a buyer can hit is the stroke of a
 * line, and a stroke of one and a half units on a four-hundred-unit
 * drawing is a hair. This walks the drawing on the screen, and for
 * each layer asks the browser which element is under a grid of
 * points, and counts how much of the space around the part is
 * actually clickable.
 *
 * Usage: node scripts/check-anatomy-hit.js [url]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/custom-services';

(async () => {
  const port = 9920 + Math.floor(Math.random() * 20);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'an' + port)}`], { stdio: 'ignore' });
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

  for (const w of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500
    });
    await send('Page.navigate', { url: URL_ + '?hit=' + Date.now() });
    await new Promise(r => setTimeout(r, 5000));
    for (let i = 0; i < 20; i++) {
      if (await ev(`!!document.querySelector('.anx-svg')`)) break;
      await new Promise(r => setTimeout(r, 700));
    }
    await new Promise(r => setTimeout(r, 1500));

    /* Bring the drawing into the viewport. elementFromPoint only knows
       about what is on screen, and the drawing sits well down the
       page — a sample taken at its coordinates from the top of the
       page lands on nothing at all. */
    await ev(`(function(){
      var svg = document.querySelector('.anx-svg');
      if (svg) svg.scrollIntoView({block:'center'});
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const out = await ev(`(function(){
      var svg = document.querySelector('.anx-svg');
      if(!svg) return JSON.stringify({error:'no diagram'});
      var box = svg.getBoundingClientRect();
      var sc = box.width / 420;   /* user units to screen pixels */

      /* Each layer is a group; find where its own painted geometry is. */
      var groups = [].slice.call(svg.querySelectorAll('g.anx-l'));

      /* For each layer, sample a grid over its bounding box and ask the
         browser what is under the point. The layer's own group counts
         as a hit for that layer. */
      function hitsFor(group){
        var gb = group.getBoundingClientRect();
        var pad = 14 * sc;
        var x0 = gb.left - pad, y0 = gb.top - pad;
        var x1 = gb.right + pad, y1 = gb.bottom + pad;
        var step = 4 * sc;
        if (step < 2) step = 2;
        var total = 0, own = 0, other = 0;
        for (var x = x0; x <= x1; x += step) {
          for (var y = y0; y <= y1; y += step) {
            var el = document.elementFromPoint(x, y);
            if (!el) continue;
            total++;
            var g = el.closest ? el.closest('g.anx-l') : null;
            if (g === group) own++;
            else if (g) other++;
          }
        }
        return { total: total, own: own, other: other };
      }

      var layers = groups.map(function(g, i){
        var h = hitsFor(g);
        return {
          i: i,
          cls: (g.getAttribute('class') || ''),
          total: h.total, own: h.own, other: h.other
        };
      });

      /* The pointer layer, in particular: how many sample points land
         on it, and how many land on nothing at all. */
      var svgBox = svg.getBoundingClientRect();
      var blank = 0, pointer = 0, total = 0;
      for (var x = svgBox.left; x < svgBox.right; x += 3) {
        for (var y = svgBox.top; y < svgBox.top + 80 * sc; y += 3) {
          var el = document.elementFromPoint(x, y);
          if (!el) continue;
          total++;
          var g = el.closest ? el.closest('g.anx-l') : null;
          if (g && (g.getAttribute('class') || '').indexOf('anx-l') === 0) {
            if (g.getAttribute('class').indexOf('anx-l') === 0 && g === groups[3]) pointer++;
          }
        }
      }
      return JSON.stringify({
        scale: sc,
        svgW: Math.round(box.width),
        layers: layers,
        topStrip: { total: total, pointer: pointer }
      });
    })()`);

    const d = JSON.parse(out);
    console.log('\n=== ' + w + 'px ===');
    if (d.error) { console.log(' ', d.error); continue; }
    console.log('  图宽 ' + d.svgW + 'px   1 用户单位 = ' + d.scale.toFixed(2) + ' 屏幕像素');
    console.log('  指针区上方 80 单位内：采样 ' + d.topStrip.total + ' 点，命中指针层 ' + d.topStrip.pointer + ' 点');
    console.log('  各层命中情况（自身命中 / 被别的层截走）:');
    for (const l of d.layers) {
      const pct = l.total ? Math.round(l.own / l.total * 100) : 0;
      console.log('    ' + l.cls.replace('anx-l', '').replace(' on', '').trim().padEnd(12) +
        String(l.own).padStart(5) + ' / ' + String(l.total).padStart(5) + '  (' + pct + '%)' +
        (l.other ? '   被截走 ' + l.other : ''));
    }
  }

  ws.close(); try { process.kill(proc.pid); } catch {};
  process.exit(0);
})();
