/**
 * Checks that a configuration built on one page arrives at the form on
 * another.
 *
 * The clock on the home page and the customiser on its own page both
 * write what the buyer chose into the enquiry form. The form is now on
 * the contact page, so the configuration travels in the link instead.
 *
 * The test is the whole journey: choose something, follow the link,
 * and look at what is in the box on the other side.
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

let failures = 0;
function check(label, ok, detail) {
  if (ok) {
    console.log('  ✓ ' + label);
  } else {
    failures++;
    console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

async function withBrowser(fn) {
  const port = 9973;
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(os.tmpdir(), 'cf' + port)}`], { stdio: 'ignore' });

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
    setTimeout(() => process.exit(process.exitCode || 0), 1200).unref();
  }
}

async function main() {
await withBrowser(async ({ send, ev }) => {
  await send('Page.enable', {});
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false
  });

  // ------------------------------------------------------------------
  console.log('The home page');
  console.log('-'.repeat(60));

  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/?v=' + Date.now() });
  await new Promise((r) => setTimeout(r, 8500));

  const home = await ev(`(function(){
    return JSON.stringify({
      hasForm: !!document.querySelector('#if-msg'),
      hasCta: !!document.querySelector('.inq-cta a'),
      ctaHref: (document.querySelector('.inq-cta a')||{}).getAttribute ? document.querySelector('.inq-cta a').getAttribute('href') : null,
      ctaLabel: (document.querySelector('.inq-cta h3')||{}).innerText || null,
      exportBtn: !!document.querySelector('.ck-export')
    });
  })()`);
  const h = JSON.parse(home);

  check('the enquiry form is no longer on the page', !h.hasForm);
  check('there is a link to the contact page instead', !!h.ctaHref, 'no .inq-cta link');
  check('the link goes to the contact page', (h.ctaHref || '').indexOf('/contact/') === 0, h.ctaHref);
  check('the link lands on the form', (h.ctaHref || '').indexOf('#inquiry') > 0, h.ctaHref);

  // ------------------------------------------------------------------
  console.log('\nThe customiser');
  console.log('-'.repeat(60));

  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/customizer?v=' + Date.now() });
  await new Promise((r) => setTimeout(r, 8500));

  const cust = await ev(`(function(){
    return JSON.stringify({
      hasForm: !!document.querySelector('#if-msg'),
      hasCta: !!document.querySelector('.inq-cta a'),
      ctaHref: (document.querySelector('.inq-cta a')||{}).getAttribute ? document.querySelector('.inq-cta a').getAttribute('href') : null,
      hasApply: !!document.querySelector('.hub-apply')
    });
  })()`);
  const c = JSON.parse(cust);

  check('the enquiry form is no longer on the page', !c.hasForm);
  check('there is a link to the contact page instead', !!c.ctaHref, 'no .inq-cta link');
  check('the configuration button is still there', c.hasApply);

  // ------------------------------------------------------------------
  console.log('\nThe clock on the home page carries its configuration');
  console.log('-'.repeat(60));

  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/?v=' + Date.now() });
  await new Promise((r) => setTimeout(r, 8500));

  /* Press the export button and follow where it goes. */
  await ev(`(function(){
    var b = document.querySelector('.ck-export');
    if (b) b.click();
    return 1;
  })()`);
  await new Promise((r) => setTimeout(r, 2500));

  const after = await ev(`(function(){
    var msg = document.querySelector('#if-msg');
    var spec = document.querySelector('#spec');
    var clockSpec = document.querySelector('#clock-spec');
    return JSON.stringify({
      url: location.pathname + location.search,
      msg: msg ? msg.value : null,
      spec: spec ? spec.value : null,
      clockSpec: clockSpec ? clockSpec.value : null,
      hasForm: !!msg
    });
  })()`);
  const a = JSON.parse(after);

  check('the export button leads to the contact page',
    a.url.indexOf('/contact') === 0, a.url);
  check('the configuration is in the message box',
    !!(a.msg && a.msg.indexOf('Clock configuration:') >= 0), JSON.stringify(a.msg));
  /* The field the factory reads is the one the enquiry submits. The
     form sends both the specification from the link and the one the
     clock wrote on the same page, so either arriving is enough. */
  check('the configuration is in a field the factory reads',
    !!((a.spec && a.spec.length > 0) || (a.clockSpec && a.clockSpec.length > 0)),
    'spec=' + JSON.stringify(a.spec) + ' clockSpec=' + JSON.stringify(a.clockSpec));
  check('the form is on the page it arrived at', a.hasForm);

  // ------------------------------------------------------------------
  console.log('\nThe customiser carries its configuration');
  console.log('-'.repeat(60));

  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/customizer?v=' + Date.now() });
  await new Promise((r) => setTimeout(r, 8500));

  /* Choose something, then press apply. */
  await ev(`(function(){
    var opts = [].slice.call(document.querySelectorAll('.hub-choice, .hub-opt, .hub-tab button'));
    if (opts.length > 2) opts[2].click();
    return opts.length;
  })()`);
  await new Promise((r) => setTimeout(r, 900));

  await ev(`(function(){
    var b = document.querySelector('.hub-apply');
    if (b) b.click();
    return 1;
  })()`);
  await new Promise((r) => setTimeout(r, 2500));

  const cAfter = await ev(`(function(){
    var msg = document.querySelector('#if-msg');
    var spec = document.querySelector('#spec');
    return JSON.stringify({
      url: location.pathname + location.search,
      msg: msg ? msg.value : null,
      spec: spec ? spec.value : null
    });
  })()`);
  const ca = JSON.parse(cAfter);

  check('the apply button leads to the contact page',
    ca.url.indexOf('/contact') === 0, ca.url);
  check('the configuration is in the message box',
    !!(ca.msg && ca.msg.indexOf('Configuration:') >= 0), JSON.stringify((ca.msg || '').slice(0, 80)));
  check('the specification code is in the hidden field',
    !!(ca.spec && ca.spec.length > 0), JSON.stringify(ca.spec));
});

console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log('A configuration survives the journey.');
} else {
  console.log(failures + ' check(s) failed.');
}
process.exit(failures === 0 ? 0 : 1);
}

main();
