/* Does the "Customizer Hub" link actually land on the hub?
 *
 * The navigation entry is a fragment link to the home page. A fragment
 * link that arrives at a page which is still being laid out can land
 * in the wrong place, because the browser scrolls to the anchor before
 * the content below it has a height.
 *
 * Two ways in are tested: a cold load of the fragment URL, and a
 * click on the link from another page.
 *
 * Usage: node scripts/check-fragment.js
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const port = 9450 + Math.floor(Math.random() * 40);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'fr' + port)}`], { stdio: 'ignore' });
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

  const probe = `(function(){
    var s=document.getElementById('studio');
    if(!s) return JSON.stringify({err:'no studio'});
    var b=s.getBoundingClientRect();
    return JSON.stringify({
      scrollY: Math.round(window.scrollY),
      studioTopRelative: Math.round(b.top),
      studioTopAbsolute: Math.round(b.top+window.scrollY),
      atTop: Math.abs(b.top) < 120,
      visible: b.top < window.innerHeight && b.bottom > 0
    });
  })()`;

  /* --- 1. a cold load of the fragment URL --- */
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/#studio' });
  await new Promise(r => setTimeout(r, 7000));
  console.log('cold load /#studio      :', await ev(probe));

  /* --- 2. a click on the link from another page --- */
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/custom-services' });
  await new Promise(r => setTimeout(r, 6000));
  const clicked = await ev(`(function(){
    var links=Array.prototype.slice.call(document.querySelectorAll('a'));
    var l=links.filter(function(a){return (a.getAttribute('href')||'')==='/#studio';})[0];
    if(!l) return 'not found';
    l.click();
    return 'clicked';
  })()`);
  console.log('click from /custom-services:', clicked);
  await new Promise(r => setTimeout(r, 7000));
  console.log('after click             :', await ev(probe));

  /* --- 3. the same on a phone --- */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/#studio' });
  await new Promise(r => setTimeout(r, 7000));
  console.log('phone cold load /#studio:', await ev(probe));

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
