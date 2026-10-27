/* Does the specification reach the enquiry?
 *
 * The customizer writes a hidden field called "spec" and the form
 * reads it with FormData. FormData only collects the fields that are
 * inside the form element, so a hidden field that sits outside it is
 * never submitted — the specification appears to be built and never
 * arrives.
 *
 * The check asks three things of every page that carries both:
 *
 *   1. The hidden field is inside the form.
 *   2. It holds the code the customizer is showing.
 *   3. FormData actually carries it.
 *
 * Usage: node scripts/check-spec-wire.js
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const PAGES = [
  { url: 'https://www.oemwallclocks.com/customizer', name: 'customizer page', hasHub: true },
  { url: 'https://www.oemwallclocks.com/', name: 'home page', hasHub: false }
];

(async () => {
  const port = 9500 + Math.floor(Math.random() * 40);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'sw' + port)}`], { stdio: 'ignore' });
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

  let pass = 0, fail = 0;
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log('  ✓ ' + name + (detail ? '  (' + detail + ')' : '')); }
    else { fail++; console.log('  ✗ ' + name + '  — ' + (detail || '')); }
  };

  await send('Page.enable', {});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  for (const p of PAGES) {
    console.log('\n=== ' + p.name + ' ===');
    await send('Page.navigate', { url: p.url });
    await new Promise(r => setTimeout(r, 6500));

    const out = JSON.parse(await ev(`(function(){
      var spec=document.getElementById('spec');
      var form=document.querySelector('form');
      var hub=document.querySelector('.hub');
      var codeEl=document.querySelector('.hub-code');
      var entryCode=document.querySelector('.hub-entry-code');
      var fd = form ? new FormData(form) : null;
      return JSON.stringify({
        specExists: !!spec,
        specInsideForm: !!(spec && form && form.contains(spec)),
        specValue: spec?spec.value:'',
        shownCode: codeEl?codeEl.textContent.trim():(entryCode?entryCode.textContent.trim():''),
        hasHub: !!hub,
        hasEntry: !!entryCode,
        specInFormData: fd ? fd.get('spec') : null,
        formExists: !!form
      });
    })()`));

    check('the form exists', out.formExists);
    check('the specification field is inside the form', out.specInsideForm);
    if (p.hasHub) {
      check('the customizer is on the page', out.hasHub);
      check('the field holds the code that is on screen',
        !!out.specValue && out.specValue === out.shownCode,
        'field=' + out.specValue + ' shown=' + out.shownCode);
      check('FormData carries the specification',
        out.specInFormData === out.shownCode,
        'formdata=' + out.specInFormData);
    } else {
      check('the full customizer is NOT on the home page', !out.hasHub);
      check('the home page shows the quick entry instead', out.hasEntry);
    }
  }

  /* --- the choices made on the home page arrive on the customizer --- */
  console.log('\n=== the home page carries its choices over ===');
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/?x=1' });
  await new Promise(r => setTimeout(r, 6500));
  const carried = JSON.parse(await ev(`(function(){
    var sels=Array.prototype.slice.call(document.querySelectorAll('.hub-entry-pick select'));
    if(sels.length!==4) return JSON.stringify({err:'expected four selects, found '+sels.length});
    /* Change the housing to the third option and read the code. */
    var before=document.querySelector('.hub-entry-code').textContent.trim();
    sels[0].value=sels[0].options[2].value;
    sels[0].dispatchEvent(new Event('change',{bubbles:true}));
    var after=document.querySelector('.hub-entry-code').textContent.trim();
    var link=document.querySelector('.hub-entry-btn');
    return JSON.stringify({
      codeBefore: before,
      codeAfter: after,
      changed: before!==after,
      href: link?link.getAttribute('href'):''
    });
  })()`));

  check('the entry shows a specification', !!carried.codeBefore, carried.codeBefore);
  check('changing a choice changes the code', carried.changed,
    carried.codeBefore + ' -> ' + carried.codeAfter);
  check('the button carries the choices in the link',
    !!carried.href && /housing=/.test(carried.href) && /movement=/.test(carried.href),
    (carried.href || '').slice(0, 90));

  /* --- the customizer page opens on the carried choice --- */
  if (carried.href) {
    await send('Page.navigate', { url: 'https://www.oemwallclocks.com/customizer' + carried.href.replace('/customizer', '') });
    await new Promise(r => setTimeout(r, 6500));
    const landed = JSON.parse(await ev(`(function(){
      var code=document.querySelector('.hub-code');
      var on=document.querySelector('.hub-tab.on');
      return JSON.stringify({
        code: code?code.textContent.trim():'',
        activeTab: on?on.textContent.trim().replace(/\\d+/,'').trim():''
      });
    })()`));
    check('the customizer opens on the carried specification',
      !!landed.code && landed.code === carried.codeAfter,
      'landed=' + landed.code + ' sent=' + carried.codeAfter);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(fail > 0 ? 1 : 0);
})();
