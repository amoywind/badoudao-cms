/**
 * Is any picture on the site cut off by its frame?
 *
 * A picture can be in the page, at the right size, at the right
 * proportion, and still have part of it hidden. It happened here: a
 * frame was made shorter than it is wide so that the photograph in it
 * would be smaller than the frame, and the picture was laid out with
 * the ordinary rule — width and height both a hundred per cent. That
 * rule does not fit a picture into a frame that is shorter than the
 * picture is wide: the percentage height has no definite height to be
 * a percentage of, so it falls back to the picture's own proportions,
 * the picture ends up taller than the frame, and the frame hides what
 * does not fit. Every clock on the home page lost ninety-one pixels
 * off the bottom.
 *
 * The check that would have caught it measured the picture's own box,
 * which was square, and compared it with the file, which is square,
 * and found nothing wrong. The box was square. What was square was
 * not what the reader could see.
 *
 * So this measures the thing that matters: whether the picture's box
 * reaches outside the inside of the frame it sits in. Anything that
 * crosses the edge is cut, however square the box is.
 *
 * Run: node scripts/check-image-crop.js
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const PAGES = [
  { url: 'https://www.oemwallclocks.com/', name: 'Home' },
  {
    url: 'https://www.oemwallclocks.com/products/resin-wall-clocks/modern-resin-wall-clock-with-3d-numerals',
    name: 'Product page'
  },
  { url: 'https://www.oemwallclocks.com/products', name: 'Catalogue' },
  { url: 'https://www.oemwallclocks.com/about-us', name: 'About the factory' },
  { url: 'https://www.oemwallclocks.com/craft-qc', name: 'Craft and QC' },
  { url: 'https://www.oemwallclocks.com/custom-services', name: 'Custom services' }
];

/* ------------------------------------------------------------------ */

/* Runs in the page. For every picture, works out whether the picture
   reaches outside the inside of its frame.

   A frame is the nearest ancestor that clips — one with overflow
   hidden, or a frame that is a picture itself. The inside of a frame
   is its box less its padding, because a picture inside the padding
   is not cut, it is merely inset. */
const PROBE = `(function(){
  var results = [];

  [].slice.call(document.querySelectorAll('img')).forEach(function(img){
    var r = img.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (!img.naturalWidth) return;

    /* The nearest clipping ancestor. */
    var frame = null;
    var p = img.parentElement;
    while (p) {
      var cs = getComputedStyle(p);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        frame = p;
        break;
      }
      p = p.parentElement;
    }
    if (!frame) return;

    var fr = frame.getBoundingClientRect();
    var cs = getComputedStyle(frame);
    var padT = parseFloat(cs.paddingTop) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var padB = parseFloat(cs.paddingBottom) || 0;
    var padL = parseFloat(cs.paddingLeft) || 0;

    /* The inside of the frame. */
    var inner = {
      l: fr.left + padL, r: fr.right - padR,
      t: fr.top + padT,  b: fr.bottom - padB
    };

    /* How far the picture reaches past each edge. */
    var over = {
      left:  Math.round(Math.max(0, inner.l - r.left)),
      right: Math.round(Math.max(0, r.right - inner.r)),
      top:   Math.round(Math.max(0, inner.t - r.top)),
      bottom:Math.round(Math.max(0, r.bottom - inner.b))
    };
    var worst = Math.max(over.left, over.right, over.top, over.bottom);

    /* The picture as it is actually drawn: object-fit decides how the
       file fills the box, and a contain picture is drawn smaller than
       its box. */
    var drawn = null;
    if (cs.objectFit === 'contain' || cs.objectFit === 'scale-down' || !cs.objectFit) {
      var nat = img.naturalWidth, natH = img.naturalHeight;
      var sc = Math.min(r.width / nat, r.height / natH);
      drawn = { w: Math.round(nat * sc), h: Math.round(natH * sc) };
    }

    results.push({
      src: (img.getAttribute('src') || '').split('/').pop().slice(0, 30),
      frame: String(frame.className || frame.tagName).slice(0, 26),
      box: Math.round(r.width) + 'x' + Math.round(r.height),
      drawn: drawn ? drawn.w + 'x' + drawn.h : null,
      over: over,
      worst: worst
    });
  });

  return results;
})()`;

/* ------------------------------------------------------------------ */

async function withBrowser(fn) {
  const port = 9975;
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(os.tmpdir(), 'ic' + port)}`], { stdio: 'ignore' });

  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const l = await r.json();
      const p = l.find((t) => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  let id = 0;
  const send = (m, p) => new Promise((res, rej) => {
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: ++id, method: m, params: p }));
  });
  const ev = async (e) =>
    (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

  try {
    await fn({ send, ev });
  } finally {
    ws.close();
    try { process.kill(proc.pid); } catch {}
    setTimeout(() => process.exit(process.exitCode || 0), 1500).unref();
  }
}

/* ------------------------------------------------------------------ */

let failures = 0;

async function main() {
await withBrowser(async ({ send, ev }) => {
  await send('Page.enable', {});

  for (const width of [1440, 390]) {
    console.log('\nWidth ' + width + 'px');
    console.log('-'.repeat(60));

    for (const p of PAGES) {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 500
      });
      await send('Page.navigate', { url: p.url + '?v=' + Date.now() });
      await new Promise((r) => setTimeout(r, 7000));

      /* Scroll through the page so that the pictures which are further
         down are loaded and laid out. */
      const list = await ev(`(function(){
        return new Promise(function(resolve){
          var y = 0;
          var step = function(){
            window.scrollTo(0, y);
            y += 700;
            if (y < document.body.scrollHeight && y < 6000) {
              setTimeout(step, 160);
            } else {
              window.scrollTo(0, 0);
              setTimeout(function(){ resolve(${PROBE}); }, 700);
            }
          };
          step();
        });
      })()`);

      const all = list || [];
      const cut = all.filter((r) => r.worst > 1);

      if (cut.length === 0) {
        console.log('  ✓ ' + p.name + ': every picture is whole');
      } else {
        failures++;
        console.log('  ✗ ' + p.name + ': ' + cut.length + ' picture(s) cut off');
        cut.slice(0, 4).forEach((c) => {
          console.log('       ' + c.src + '  in .' + c.frame +
            '  box ' + c.box + '  drawn ' + c.drawn +
            '  over ' + JSON.stringify(c.over));
        });
      }
    }
  }
});

console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log('No picture is cut off by its frame.');
} else {
  console.log(failures + ' page/width combination(s) with a cut picture.');
}
process.exit(failures === 0 ? 0 : 1);
}

main();
