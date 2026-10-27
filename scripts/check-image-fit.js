/* Are any product photographs being cut off?
 *
 * Every main photograph on this site was shot square, so a frame that
 * is not square, or an image that is filled rather than contained,
 * cuts the clock. The frame can be found in the stylesheet, but the
 * stylesheet says what is intended rather than what the browser
 * computed, and the browser is what the buyer sees.
 *
 * This reads the computed style of every image on a set of pages and
 * reports the ones whose frame is not square, or whose image is
 * cropped to fill.
 *
 * Usage: node scripts/check-image-fit.js [baseUrl]
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
  '/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock',
  '/news',
  '/articles',
  '/customizer',
  '/custom-services',
  '/components',
  '/craft-qc'
];

(async () => {
  const port = 9650 + Math.floor(Math.random() * 30);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'if' + port)}`], { stdio: 'ignore' });
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

  let problems = 0;
  let checked = 0;

  for (const p of PAGES) {
    await send('Page.navigate', { url: BASE + p });
    await new Promise(r => setTimeout(r, 5000));

    /* The images are lazy-loaded, so a page that has not been
       scrolled shows one or two of them. The page is scrolled to the
       bottom and back so that every image has been asked for, and the
       natural sizes are read after that.

       The scrolling is done by the browser rather than by a promise
       inside the page: Runtime.evaluate does not wait for a promise
       to settle, so a scroll driven by one never gets a chance to
       finish before the reading. */
    const H = await send('Page.getLayoutMetrics', {});
    const pageH = Math.ceil(H.cssContentSize?.height || 0);
    const vh = 900;
    for (let y = 0; y < pageH; y += vh) {
      await ev('window.scrollTo(0,' + y + ')');
      await new Promise(r => setTimeout(r, 220));
    }
    await ev('window.scrollTo(0,0)');
    await new Promise(r => setTimeout(r, 1500));

    const out = JSON.parse(await ev(`(function(){
      var imgs=Array.prototype.slice.call(document.querySelectorAll('img'));
      var rows=[];
      for(var i=0;i<imgs.length;i++){
        var im=imgs[i];
        var r=im.getBoundingClientRect();
        if(r.width<8||r.height<8) continue;
        var cs=getComputedStyle(im);
        var parent=im.parentElement;
        var pcs=parent?getComputedStyle(parent):null;

        /* The ratio of the box the image is drawn in. */
        var ratio=Math.round((r.width/r.height)*100)/100;
        /* The ratio of the file itself. */
        var nat=im.naturalWidth&&im.naturalHeight
          ? Math.round((im.naturalWidth/im.naturalHeight)*100)/100 : 0;

        /* The frame is the box the picture is drawn in. For a product
           card that is the square container, not the image element —
           the image is letterboxed inside it, and the element's own
           rectangle is the letterbox rather than the picture. */
        var frame=parent;
        var fr=frame?frame.getBoundingClientRect():r;
        var frameRatio=Math.round((fr.width/fr.height)*100)/100;
        var frameAR=pcs?pcs.aspectRatio:'';

        rows.push({
          cls:(im.className||'').toString()||im.parentElement.className||'',
          parent:(parent?(parent.className||'').toString():''),
          fit: cs.objectFit,
          box: Math.round(r.width)+'x'+Math.round(r.height),
          ratio: ratio,
          frameBox: Math.round(fr.width)+'x'+Math.round(fr.height),
          frameRatio: frameRatio,
          frameAR: frameAR,
          natural: nat,
          src:(im.getAttribute('src')||'').slice(-46)
        });
      }
      return JSON.stringify(rows);
    })()`));

    /* A photograph is cut when the frame is not the shape of the
       file and the image is filled rather than contained.

       The frame does not have to be square: the factory photograph on
       the home page is three by two and its frame is three by two,
       and nothing is cut. What matters is that the shape the buyer
       sees matches the shape of the file.

       A square file in a frame that is not square is a cut even when
       the image is contained — the clock is shrunk to fit inside
       grey bars, and it reads as a broken frame rather than as a
       picture of a clock. */
    const bad = out.filter((r) => {
      /* The shape of the frame the picture is drawn in. */
      const fr = r.frameRatio;
      if (!(fr > 0)) return false;

      if (r.fit === 'cover') {
        /* Filled: cut unless the frame matches the file. */
        return !(r.natural > 0 && Math.abs(fr - r.natural) <= 0.06);
      }
      /* Contained: a square file in a frame of another shape leaves
         bars where the picture should be. */
      if (r.natural > 0 && Math.abs(r.natural - 1) <= 0.06) {
        return Math.abs(fr - 1) > 0.06;
      }
      return false;
    });

    checked += out.length;
    if (bad.length) {
      console.log('\n' + p + '  — ' + bad.length + ' of ' + out.length + ' images');
      for (const b of bad.slice(0, 8)) {
        console.log('   ', (b.parent || b.cls).slice(0, 28).padEnd(28),
          b.fit.padEnd(8), ('frame ' + b.frameBox).padEnd(16),
          'fr=' + b.frameRatio, 'nat=' + b.natural, b.src);
      }
      problems += bad.length;
    } else {
      console.log(p.padEnd(52) + out.length + ' images, all square and contained');
    }
  }

  console.log('\n' + checked + ' images checked, ' + problems + ' that crop');
  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(problems > 0 ? 1 : 0);
})();
