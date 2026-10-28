/* Where a declared maximum width is not the width that is applied.
 *
 * A stylesheet can say "this may be as wide as the page" and win over
 * a rule that said "this is at most four hundred and forty pixels"
 * without anyone noticing: the element is a little larger than it
 * should be, and nothing looks broken. It is only visible when the
 * two numbers are compared.
 *
 * This reads the rules that set a maximum width and checks each
 * element against the one the browser actually applied.
 *
 * Usage: node scripts/check-max-width.js [url]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/custom-services';

(async () => {
  const port = 9940 + Math.floor(Math.random() * 20);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'mw' + port)}`], { stdio: 'ignore' });
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_ + '?mw=' + Date.now() });
  await new Promise(r => setTimeout(r, 6500));

  const out = await ev(`(function(){
    /* Every rule that sets a maximum width, and the element it names. */
    var rules = [];
    for (var i=0;i<document.styleSheets.length;i++){
      var sheet=document.styleSheets[i];
      var list; try{list=sheet.cssRules;}catch(e){continue;}
      for (var j=0;j<list.length;j++){
        var r=list[j];
        if(!r.selectorText || !r.style || !r.style.maxWidth) continue;
        rules.push({ sel: r.selectorText, mw: r.style.maxWidth, sheet: (sheet.href||'inline').split('/').pop() });
      }
    }

    var bad = [];
    var seen = {};
    for (var k=0;k<rules.length;k++){
      var sel = rules[k].sel;
      var els;
      try { els = document.querySelectorAll(sel); } catch(e) { continue; }
      for (var e=0;e<els.length;e++){
        var el = els[e];
        var applied = getComputedStyle(el).maxWidth;
        var declared = rules[k].mw;
        /* A rule that says "as wide as the page" has overwritten a
           tighter limit. */
        if (applied === '100%' && declared !== '100%' && declared !== 'none') {
          var key = sel + '|' + declared;
          if (seen[key]) continue;
          seen[key] = 1;
          bad.push({
            sel: sel, declared: declared, applied: applied,
            w: Math.round(el.getBoundingClientRect().width),
            tag: el.tagName.toLowerCase() + '.' + (el.className||'').toString().split(' ').slice(0,2).join('.'),
            sheet: rules[k].sheet
          });
        }
      }
    }
    return JSON.stringify(bad);
  })()`);

  const bad = JSON.parse(out);
  console.log('\n=== ' + URL_ + ' ===');
  if (!bad.length) {
    console.log('  没有被覆盖的最大宽度');
  } else {
    console.log('  ' + bad.length + ' 处声明的最大宽度没有生效:');
    for (const b of bad) {
      console.log('    ' + b.tag.padEnd(30) + ' 声明 ' + b.declared.padEnd(10) +
        ' 实际 ' + b.applied.padEnd(8) + ' 宽 ' + b.w + 'px');
      console.log('        ' + b.sel + '   [' + b.sheet + ']');
    }
  }

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
