/* Where does the customizer sit on the home page?
 *
 * The question is whether the hub belongs on the home page or on a
 * page of its own, and the answer depends on how far down it is and
 * what the buyer has seen by the time they reach it.
 *
 * Usage: node scripts/measure-studio.js
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const port = 9400 + Math.floor(Math.random() * 50);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'ms' + port)}`], { stdio: 'ignore' });
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

  for (const [w, h, label] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
    await send('Page.navigate', { url: 'https://www.oemwallclocks.com/' });
    await new Promise(r => setTimeout(r, 6000));

    const out = await ev(`(function(){
      var doc=document.documentElement;
      var total=doc.scrollHeight;
      var vh=window.innerHeight;
      var sec=document.getElementById('studio');
      var sb=sec?sec.getBoundingClientRect():null;
      var top=sb?Math.round(sb.top+window.scrollY):null;

      /* Every top-level section of the main, in order, with its height
         and its share of the page. */
      var rows=[];
      var main=document.querySelector('main');
      for(var i=0;i<main.children.length;i++){
        var el=main.children[i];
        var b=el.getBoundingClientRect();
        var tag=el.tagName.toLowerCase();
        var id=el.id||'';
        var cls=(el.className||'').toString().split(' ')[0];
        var h2=el.querySelector('h2');
        var title=h2?h2.textContent.trim().slice(0,42):(el.querySelector('h1')?el.querySelector('h1').textContent.trim().slice(0,42):'');
        rows.push({id:id, cls:cls, h:Math.round(b.height), top:Math.round(b.top+window.scrollY), title:title});
      }

      /* Where the RFQ form is, and whether the hub's apply button can
         still reach it. */
      var inq=document.getElementById('inquiry');
      var apply=document.querySelector('.hub-apply');
      var forms=document.querySelectorAll('form').length;

      return JSON.stringify({
        viewport: vh,
        totalHeight: total,
        screens: Math.round(total/vh*10)/10,
        studioTop: top,
        studioDepthScreens: top?Math.round(top/vh*10)/10:null,
        studioDepthPercent: top?Math.round(top/total*100):null,
        sections: rows,
        inquiryTop: inq?Math.round(inq.getBoundingClientRect().top+window.scrollY):null,
        applyExists: !!apply,
        formsOnPage: forms
      }, null, 1);
    })()`);
    console.log('=== ' + label + ' (' + w + 'x' + h + ') ===');
    console.log(out);
  }

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
