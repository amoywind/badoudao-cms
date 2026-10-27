/* Does the specification travel from the customizer to the enquiry?
 *
 * Runs against the live site. The path being checked is the one a
 * buyer takes: pick four things, press the button, arrive at the form
 * with the specification already in it.
 *
 * Usage: node scripts/check-spec-flow.js [baseUrl]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const BASE = process.argv[2] || 'https://www.oemwallclocks.com';

(async () => {
  const port = 9550 + Math.floor(Math.random() * 40);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'sf' + port)}`], { stdio: 'ignore' });
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

  /* --- 1. the customizer page --- */
  console.log('\n=== the customizer page ===');
  await send('Page.navigate', { url: BASE + '/customizer' });
  await new Promise(r => setTimeout(r, 7000));

  const page1 = JSON.parse(await ev(`(function(){
    var spec=document.getElementById('spec');
    var form=document.querySelector('form');
    var codeEl=document.querySelector('.hub-code');
    var fd=form?new FormData(form):null;
    return JSON.stringify({
      hasHub: !!document.querySelector('.hub'),
      hubTabs: document.querySelectorAll('.hub-tab').length,
      shown: codeEl?codeEl.textContent.trim():'',
      specValue: spec?spec.value:'',
      specInsideForm: !!(spec&&form&&form.contains(spec)),
      inFormData: fd?fd.get('spec'):null,
      hasInquiry: !!document.getElementById('inquiry')
    });
  })()`));

  check('the customizer renders', page1.hasHub);
  check('all four tabs are there', page1.hubTabs === 4, page1.hubTabs + ' tabs');
  check('the enquiry form is on the same page', page1.hasInquiry);
  check('the specification field is inside the form', page1.specInsideForm);
  check('the field holds the code on screen', page1.specValue === page1.shown,
    page1.specValue + ' / ' + page1.shown);
  check('FormData carries the specification', page1.inFormData === page1.shown,
    String(page1.inFormData));

  /* --- 2. change a choice and watch the field follow --- */
  console.log('\n=== changing a choice ===');
  /* The chime option is on the movement tab, so the tab is opened
     first. The click and the reading are separate evaluations so that
     React has re-rendered in between — reading the DOM in the same
     tick as the click reads the state before the change. */
  const opened = await ev(`(function(){
    var tabs=Array.prototype.slice.call(document.querySelectorAll('.hub-tab'));
    var mv=tabs.filter(function(t){return (t.textContent||'').indexOf('Movement')>-1;})[0];
    if(!mv) return 'no movement tab';
    mv.click();
    return 'opened';
  })()`);
  check('the movement tab was opened', opened === 'opened', opened);
  await new Promise(r => setTimeout(r, 700));

  const clicked = await ev(`(function(){
    var btns=Array.prototype.slice.call(document.querySelectorAll('.hub-opt'));
    /* The label is "Westminster chime", so the match is on the case
       of the word as it is written. */
    var chime=btns.filter(function(b){return (b.textContent||'').toLowerCase().indexOf('chime')>-1;})[0];
    if(!chime) return 'no chime option';
    chime.click();
    return 'clicked';
  })()`);
  check('the chime option was found', clicked === 'clicked', clicked);
  await new Promise(r => setTimeout(r, 900));

  const page2 = JSON.parse(await ev(`(function(){
    var spec=document.getElementById('spec');
    var msg=document.getElementById('if-msg');
    var form=document.querySelector('form');
    var fd=new FormData(form);
    var codeEl=document.querySelector('.hub-code');
    return JSON.stringify({
      shown: codeEl?codeEl.textContent.trim():'',
      specValue: spec?spec.value:'',
      inFormData: fd.get('spec'),
      messageHead: msg?String(msg.value||'').split('\\n').filter(Boolean).join(' | '):''
    });
  })()`));

  check('the code on screen changes', page2.shown && /CHIME/i.test(page2.shown), page2.shown);
  check('the hidden field follows', page2.specValue === page2.shown, page2.specValue);
  check('FormData still carries it', page2.inFormData === page2.shown, String(page2.inFormData));
  check('the message summary names the new movement',
    /chime/i.test(page2.messageHead || ''), (page2.messageHead || '').slice(0, 80));

  /* --- 3. the home page's quick picker --- */
  console.log('\n=== the home page entry ===');
  await send('Page.navigate', { url: BASE + '/' });
  await new Promise(r => setTimeout(r, 7000));
  const page3 = JSON.parse(await ev(`(function(){
    var sels=Array.prototype.slice.call(document.querySelectorAll('.hub-entry-pick select'));
    var codeEl=document.querySelector('.hub-entry-code');
    var link=document.querySelector('.hub-entry-btn');
    var hub=document.querySelector('.hub');
    return JSON.stringify({
      hasEntry: !!codeEl,
      hasFullHub: !!hub,
      selects: sels.length,
      shown: codeEl?codeEl.textContent.trim():'',
      href: link?link.getAttribute('href'):''
    });
  })()`));

  check('the home page shows the quick entry', page3.hasEntry);
  check('the home page does NOT carry the full customizer', !page3.hasFullHub);
  check('the entry offers four choices', page3.selects === 4, page3.selects + ' selects');
  check('the entry shows a specification', /^OEM-/.test(page3.shown || ''), page3.shown);
  check('the button points at the customizer page',
    /\/customizer/.test(page3.href || ''), (page3.href || '').slice(0, 70));

  /* --- 4. the choices carry over --- */
  console.log('\n=== the choices carry over ===');
  const page4 = JSON.parse(await ev(`(function(){
    var sels=Array.prototype.slice.call(document.querySelectorAll('.hub-entry-pick select'));
    sels[0].value=sels[0].options[1].value;
    sels[0].dispatchEvent(new Event('change',{bubbles:true}));
    sels[1].value=sels[1].options[2].value;
    sels[1].dispatchEvent(new Event('change',{bubbles:true}));
    var code=document.querySelector('.hub-entry-code').textContent.trim();
    var link=document.querySelector('.hub-entry-btn');
    return JSON.stringify({code:code, href:link?link.getAttribute('href'):''});
  })()`));

  check('the code follows the choices', /AL02/.test(page4.code || '') && /RCC/.test(page4.code || ''),
    page4.code);
  check('the link carries them', /housing=AL02/.test(page4.href || '') && /movement=RCC/.test(page4.href || ''),
    (page4.href || '').slice(0, 80));

  if (page4.href) {
    await send('Page.navigate', { url: BASE + page4.href });
    await new Promise(r => setTimeout(r, 7000));
    const page5 = JSON.parse(await ev(`(function(){
      var code=document.querySelector('.hub-code');
      var spec=document.getElementById('spec');
      var form=document.querySelector('form');
      var fd=form?new FormData(form):null;
      return JSON.stringify({
        shown: code?code.textContent.trim():'',
        specValue: spec?spec.value:'',
        inFormData: fd?fd.get('spec'):null
      });
    })()`));
    check('the customizer opens on the carried specification', page5.shown === page4.code,
      page5.shown + ' vs ' + page4.code);
    check('and the form already holds it', page5.inFormData === page4.code, String(page5.inFormData));
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(fail > 0 ? 1 : 0);
})();
