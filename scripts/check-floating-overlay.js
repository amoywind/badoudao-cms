/**
 * Does anything on the page float over the content?
 *
 * There were two separate faults here and both were on screen without
 * being noticed, because a screenshot of a page at the top of it shows
 * neither. The picture was pinned 24 pixels from the top of the window
 * while the site header is 73 pixels tall, so the top of every clock
 * went behind the header. And the picture was pinned over the product
 * description, so the description slid underneath it.
 *
 * A check that looks at one position on the page cannot find either of
 * those. This one scrolls, and at every step it asks the browser what
 * is actually on top at the pixels where the content is.
 *
 * Two things are measured:
 *
 *   1. Is a pinned element hiding under the header? The header is 73
 *      pixels tall. Anything pinned closer to the top than that slides
 *      beneath it.
 *
 *   2. Does a pinned element cover a piece of text? The test is the
 *      browser's own: elementFromPoint returns the element that would
 *      receive a click at that pixel. If the answer is the floating
 *      thing rather than the text, the text is covered.
 *
 * The header and the mobile bottom bar are page furniture — the lid and
 * the floor — and they are excluded from the second test. Text passing
 * under a fixed header is what a fixed header does on every site, and
 * the reader scrolls on past it. A picture pinned over a paragraph is a
 * different thing: the paragraph is not reachable by scrolling, because
 * the picture is over it and the picture does not move.
 *
 * Run: node scripts/check-floating-overlay.js
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const PAGES = [
  {
    url: 'https://www.oemwallclocks.com/products/resin-wall-clocks/modern-resin-wall-clock-with-3d-numerals',
    name: 'Product page'
  },
  {
    url: 'https://www.oemwallclocks.com/products/plastic-wall-clocks/vintage-moving-gear-wall-clock-with-silent-movement',
    name: 'Product page 2'
  },
  { url: 'https://www.oemwallclocks.com/', name: 'Home' },
  { url: 'https://www.oemwallclocks.com/products', name: 'Catalogue' },
  { url: 'https://www.oemwallclocks.com/custom-services', name: 'Custom services' },
  { url: 'https://www.oemwallclocks.com/about-us', name: 'About the factory' }
];

/* Only the pages that can be asked for by name, so one can be checked
   on its own: node scripts/check-floating-overlay.js "Product page" */
const ONLY = process.argv[2];

/* Text that matters to a buyer. A button label, a price, a heading. */
const TEXT_SELECTOR = [
  'h1', 'h2', 'h3',
  '.pd-info p', '.pd-desc p', '.pd-desc li', '.pd-desc h2',
  '.btn', '.pd-badge', '.pd-price b', '.cert-name', '.mat-body p',
  '.sec-sub', '.exw', '.pd-moq-v'
].join(', ');

let failures = 0;

function check(label, ok, detail) {
  if (ok) {
    console.log('  ✓ ' + label);
  } else {
    failures++;
    console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

/* ------------------------------------------------------------------ */

async function withBrowser(fn) {
  const port = 9970 + Math.floor(Math.random() * 20);
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(os.tmpdir(), 'fo' + port)}`
  ], { stdio: 'ignore' });

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
    /* The browser leaves child processes behind and Node's event loop
       waits for them. Without this the script finishes its work and
       then hangs instead of exiting. */
    setTimeout(() => process.exit(process.exitCode || 0), 1500).unref();
  }
}

/* ------------------------------------------------------------------ */

/* Runs in the page. Collects everything that floats and everything it
   might be hiding. */
const PROBE = `(function(){
  var header = document.querySelector('.site-header');
  var headerH = header ? header.getBoundingClientRect().height : 0;

  /* Everything that is pinned or fixed and is actually on screen. */
  var floaters = [];
  [].slice.call(document.querySelectorAll('body *')).forEach(function(el){
    var cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    /* A pinned element that is off the screen is not covering anything. */
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    floaters.push({
      el: el,
      pos: cs.position,
      top: Math.round(r.top),
      left: Math.round(r.left),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      w: Math.round(r.width),
      h: Math.round(r.height),
      z: cs.zIndex,
      cls: String(el.className || el.tagName).slice(0, 40)
    });
  });

  /* The site header and the mobile bottom bar are furniture. They are
     the lid and the floor: they are meant to be over the content, and
     content passes under them as the reader scrolls. What this test is
     looking for is a piece of the page floating over another piece of
     the page — a picture over a paragraph — which no amount of
     scrolling gets you out of. */
  var chrome = [];
  if (header) chrome.push(header);
  var mbar = document.querySelector('.mbar');
  if (mbar) chrome.push(mbar);
  function isChrome(el){
    for (var i = 0; i < chrome.length; i++) if (chrome[i] === el) return true;
    return false;
  }

  var covered = [];
  [].slice.call(document.querySelectorAll('${TEXT_SELECTOR}')).forEach(function(el){
    if (el.closest('.site-header') || el.closest('.mbar')) return;
    /* Text that is part of the floating element itself is not covered by
       it — it is the floating element. The category bar's own heading
       was being reported against the category bar. */
    for (var f = 0; f < floaters.length; f++) {
      if (floaters[f].el.contains(el)) return;
    }
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    if (r.bottom < 0 || r.top > window.innerHeight) return;

    /* The middle of the text. */
    var x = r.left + Math.min(r.width / 2, 40);
    var y = r.top + r.height / 2;
    if (y < 0 || y > window.innerHeight) return;

    var top = document.elementFromPoint(x, y);
    if (!top) return;

    /* Is the element on top one of the floating things? */
    var coveredBy = null;
    var walker = top;
    while (walker) {
      for (var i = 0; i < floaters.length; i++) {
        if (floaters[i].el === walker) { coveredBy = floaters[i]; break; }
      }
      if (coveredBy) break;
      walker = walker.parentElement;
    }
    if (!coveredBy) return;
    /* Furniture is allowed to be on top. */
    if (isChrome(coveredBy.el)) return;

    /* And is the text actually behind it, rather than beside it? */
    var fr = coveredBy.el.getBoundingClientRect();
    var behind = !(r.right <= fr.left || r.left >= fr.right ||
                   r.bottom <= fr.top || r.top >= fr.bottom);
    if (!behind) return;

    covered.push({
      text: (el.innerText || '').replace(/\\s+/g, ' ').slice(0, 40),
      by: coveredBy.cls,
      byPos: coveredBy.pos,
      byTop: coveredBy.top
    });
  });

  /* Anything pinned closer to the top than the header slides under it. */
  var underHeader = floaters.filter(function(f){
    if (isChrome(f.el)) return false;
    return f.pos === 'sticky' && f.top < headerH - 4 && f.top >= 0;
  }).map(function(f){ return { cls: f.cls, top: f.top, h: f.h }; });

  return {
    headerH: Math.round(headerH),
    floaters: floaters.map(function(f){
      return { cls: f.cls, pos: f.pos, top: f.top, bottom: f.bottom, w: f.w, h: f.h, z: f.z };
    }),
    underHeader: underHeader,
    covered: covered
  };
})()`;

/* ------------------------------------------------------------------ */

(async () => {
  console.log('Floating elements and what they cover');
  console.log('='.repeat(60));

  /* One browser for the whole run. Starting a fresh one for each page
     cost about eight seconds a page, and the check is worth running
     often enough that it cannot take four minutes. */
  await withBrowser(async ({ send, ev }) => {
    await send('Page.enable', {});

    for (const width of [1440, 390]) {
      console.log('\nWidth ' + width + 'px');
      console.log('-'.repeat(60));

      for (const p of PAGES) {
        if (ONLY && p.name.indexOf(ONLY) === -1) continue;

        await send('Emulation.setDeviceMetricsOverride', {
          width, height: 900, deviceScaleFactor: 1, mobile: width < 500
        });
        await send('Page.navigate', { url: p.url + '?v=' + Date.now() });
        await new Promise((r) => setTimeout(r, 6500));

        /* INJECT_STICKY puts the old pinning back, to prove this check
           would catch it. Used when a fix is being verified. */
        if (process.env.INJECT_STICKY) {
          await ev(`(function(){
            var st = document.createElement('style');
            st.textContent = '@media (min-width:1025px){ .pd-gallery-area { position: sticky; top: 24px; } }';
            document.head.appendChild(st);
            return 1;
          })()`);
          await new Promise((r) => setTimeout(r, 400));
        }

        const steps = [0, 600, 1300, 2100];
        const bad = [];
        const under = [];
        const floaters = [];

        for (const y of steps) {
          const res = await ev(`(function(){
            window.scrollTo(0, ${y});
            return new Promise(function(resolve){
              setTimeout(function(){
                try { resolve(${PROBE}); }
                catch(e) { resolve({ error: String(e && e.stack || e), covered: [], underHeader: [], floaters: [] }); }
              }, 550);
            });
          })()`);
          if (!res) continue;
          for (const c of res.covered) {
            bad.push('scroll ' + y + ': "' + c.text + '" under ' + c.by);
          }
          for (const u of res.underHeader) {
            under.push('scroll ' + y + ': ' + u.cls + ' pinned ' + u.top + 'px (header ' + res.headerH + 'px)');
          }
          for (const f of res.floaters) {
            const key = f.cls + f.pos + f.top;
            if (!floaters.find((x) => x.key === key)) {
              floaters.push(Object.assign({ key }, f));
            }
          }
        }


        const label = p.name;
        if (bad.length === 0 && under.length === 0) {
          check(label + ': nothing floats over the content', true);
        } else {
          if (under.length) check(label + ': nothing pinned under the header', false, under[0]);
          if (bad.length) check(label + ': no text covered by a floating element', false, bad[0]);
        }
        if (process.env.VERBOSE) {
          floaters.forEach((f) => {
            console.log('      · ' + f.cls + ' [' + f.pos + ' top ' + f.top + ' z ' + f.z + ' ' + f.w + 'x' + f.h + ']');
          });
        }
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  if (failures === 0) {
    console.log('All clear.');
  } else {
    console.log(failures + ' problem(s) found.');
  }
  process.exit(failures === 0 ? 0 : 1);
})();
