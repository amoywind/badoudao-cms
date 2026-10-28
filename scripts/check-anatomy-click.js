/* Can the hands be clicked where they are drawn?
 *
 * The drawing is a set of parts, and each part is meant to be picked
 * by clicking on it. The question this answers is the plain one: if
 * the buyer aims at the second hand, does the second hand get
 * selected?
 *
 * It takes the screen position of the drawn line itself — the middle
 * of the stroke, exactly where the eye goes — and clicks there. Then
 * it clicks a spot just above the line, which is the near miss that
 * the old one-and-a-half-unit stroke could not survive.
 *
 * Usage: node scripts/check-anatomy-click.js [url]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/custom-services';

(async () => {
  const port = 9950 + Math.floor(Math.random() * 20);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'ac' + port)}`], { stdio: 'ignore' });
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
  const click = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    await new Promise(r => setTimeout(r, 500));
  };

  await send('Page.enable', {});

  for (const w of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500
    });
    await send('Page.navigate', { url: URL_ + '?click=' + Date.now() });
    await new Promise(r => setTimeout(r, 5000));
    for (let i = 0; i < 20; i++) {
      if (await ev(`!!document.querySelector('.anx-svg')`)) break;
      await new Promise(r => setTimeout(r, 700));
    }
    await ev(`document.querySelector('.anx-svg').scrollIntoView({block:'center'})`);
    await new Promise(r => setTimeout(r, 1500));

    /* The three hands, and the back ring, in the drawing's own
       coordinates. The hands are the second, third and fourth lines
       of the hands layer; the ring is the circle of radius 112. */
    const geom = await ev(`(function(){
      var svg=document.querySelector('.anx-svg');
      var box=svg.getBoundingClientRect();
      var sc=box.width/420;
      function pt(x,y){ return { x: box.left + x*sc, y: box.top + y*sc }; }
      var handsG=[].slice.call(svg.querySelectorAll('g.anx-l'))
        .find(function(g){ return (g.getAttribute('class')||'').indexOf('anx-l')===0 &&
          g.querySelectorAll('line').length>=3 && g.querySelector('rect'); });
      var lines = handsG ? [].slice.call(handsG.querySelectorAll('line'))
        .filter(function(l){ return l.getAttribute('stroke')!=='transparent'; })
        .filter(function(l){ return l.getAttribute('stroke')!=='#D97706'; }) : [];
      var out={ sc: sc, svgW: box.width, hands: [], ring: null };
      lines.forEach(function(l){
        var x1=+l.getAttribute('x1'), y1=+l.getAttribute('y1');
        var x2=+l.getAttribute('x2'), y2=+l.getAttribute('y2');
        out.hands.push({
          mid: pt((x1+x2)/2, (y1+y2)/2),
          above: pt((x1+x2)/2, (y1+y2)/2 - 10),
          below: pt((x1+x2)/2, (y1+y2)/2 + 10),
          w: +(l.getAttribute('stroke-width') || l.getAttribute('strokeWidth') || 0)
        });
      });
      out.ring = pt(210, 196-112);
      return JSON.stringify(out);
    })()`);

    const g = JSON.parse(geom);
    console.log('\n=== ' + w + 'px  (图宽 ' + Math.round(g.svgW) + 'px, 1 单位 = ' + g.sc.toFixed(2) + ' px) ===');

    const names = ['时针', '分针', '秒针'];
    for (let i = 0; i < g.hands.length; i++) {
      const h = g.hands[i];
      const label = names[i] || ('针' + (i + 1));

      await ev(`(function(){
        var tabs=[].slice.call(document.querySelectorAll('.anx-tabs button, .anx-tab'));
        return true;
      })()`);

      // Click on the line itself.
      await click(h.mid.x, h.mid.y);
      const onLine = await ev(`(function(){
        var g=[].slice.call(document.querySelectorAll('g.anx-l'));
        var on=g.filter(function(x){return x.classList.contains('on');});
        return on.length ? on[0].querySelector('text') ? 'picked' : 'picked' : 'nothing';
      })()`);

      // Click a little above the line, where the eye misses.
      await click(h.above.x, h.above.y);
      const near = await ev(`(function(){
        var g=[].slice.call(document.querySelectorAll('g.anx-l'));
        var on=g.filter(function(x){return x.classList.contains('on');});
        return on.length ? 'picked' : 'nothing';
      })()`);

      // And below.
      await click(h.below.x, h.below.y);
      const near2 = await ev(`(function(){
        var g=[].slice.call(document.querySelectorAll('g.anx-l'));
        var on=g.filter(function(x){return x.classList.contains('on');});
        return on.length ? 'picked' : 'nothing';
      })()`);

      const px = (h.w * g.sc).toFixed(1);
      console.log('  ' + label + '（笔画 ' + h.w + ' 单位 = ' + px + 'px）');
      console.log('    点在针上      ' + (onLine === 'picked' ? '✓ 命中' : '✗ 没中'));
      console.log('    点针上方 10单位 ' + (near === 'picked' ? '✓ 命中' : '✗ 没中'));
      console.log('    点针下方 10单位 ' + (near2 === 'picked' ? '✓ 命中' : '✗ 没中'));
    }
  }

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
