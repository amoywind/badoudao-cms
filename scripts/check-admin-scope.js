/* Did scoping the admin's rules to .admin-root change the admin?
 *
 * The admin's stylesheet had nineteen rules that reached outside the
 * admin — body, a, button, input, table, th — and they are now
 * scoped to the wrapper the admin already has. The question is whether
 * the admin still looks the same.
 *
 * The admin pages need a session to open, and the password for the
 * live site is not in this repository. So instead the admin's markup
 * is built here, on a public page, inside a .admin-root wrapper, and
 * the computed style of every part of it is read. The same thing is
 * done before and after the change, and the two are compared.
 *
 * Usage: node scripts/check-admin-scope.js <output-file> [baseUrl]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const fs = require('fs');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const OUT = process.argv[2] || 'scripts/.admin-scope.txt';
const BASE = process.argv[3] || 'http://localhost:3111';

(async () => {
  const port = 9880 + Math.floor(Math.random() * 20);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'as' + port)}`], { stdio: 'ignore' });
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
  await send('Page.navigate', { url: BASE + '/products' });
  await new Promise(r => setTimeout(r, 6000));

  /* Wait for the stylesheets, so the reading is of a styled page. */
  await ev(`(function(){
    var sheets = performance.getEntriesByType('resource')
      .filter(function(r){ return r.name.indexOf('.css') >= 0; });
    return sheets.length > 0 && sheets.every(function(r){ return r.responseEnd; });
  })()`);
  await new Promise(r => setTimeout(r, 1500));

  const out = await ev(`(function(){
    /* The admin's own markup, built here: the wrapper, the sidebar, a
       table, the form controls and the buttons. */
    var host = document.createElement('div');
    host.id = 'scope-probe';
    host.className = 'admin-root';
    host.innerHTML =
      '<div class="app"><aside class="side"><div class="side-h"><div class="lg">BADOU<span>DAO</span></div></div>' +
      '<nav class="nav"><div class="nav-g">内容</div>' +
      '<a class="nav-i" href="/x"><span>图片库</span></a></nav></aside>' +
      '<div class="main"><div class="content">' +
      '<table><thead><tr><th>Name</th><th>Size</th></tr></thead>' +
      '<tbody><tr><td>Ball clock</td><td>12 inch</td></tr>' +
      '<tr><td>Wood clock</td><td>16 inch</td></tr></tbody></table>' +
      '<div class="fg"><label class="fl"><span>Name</span>' +
      '<input class="inp" value="x" /></label>' +
      '<label class="fl"><span>Type</span><select class="inp"><option>a</option></select></label>' +
      '<label class="fl"><span>Note</span><textarea class="inp">note</textarea></label></div>' +
      '<div class="fg2"><button class="btn btn-p">Save</button><button class="btn">Cancel</button></div>' +
      '<img class="thumb" src="/api/media-thumb/img_5edce87729154d0b" alt="" />' +
      '<div class="card"><div class="card-b"><h3>Title</h3><p>Body text</p></div></div>' +
      '<div class="stats"><div class="stat"><span class="stat-n">12</span><span class="stat-l">Products</span></div></div>' +
      '</div></div></div>';
    document.body.appendChild(host);

    /* Every part of it, with the properties that decide how it looks. */
    var PROPS = ['display','position','width','height','margin','padding','backgroundColor',
                 'color','fontSize','fontWeight','lineHeight','borderTopWidth','borderRadius',
                 'textAlign','textTransform','whiteSpace','overflow','letterSpacing',
                 'boxSizing','borderCollapse','tableLayout','objectFit','resize','cursor'];
    var rows = [];
    var parts = host.querySelectorAll('*');
    for (var i = 0; i < parts.length; i++) {
      var el = parts[i];
      var cls = (el.className || '').toString().trim().split(/\\s+/).slice(0,2).join('.');
      var tag = el.tagName.toLowerCase();
      if (!cls && tag !== 'table' && tag !== 'tbody' && tag !== 'tr') continue;
      var cs = getComputedStyle(el);
      var vals = [];
      for (var j = 0; j < PROPS.length; j++) vals.push(cs[PROPS[j]]);
      rows.push(tag + '.' + cls + '|' + vals.join('|'));
    }

    /* And the variables the wrapper carries. */
    var vars = [];
    var names = ['--ink','--ink2','--ink3','--line','--line2','--bg','--card','--brand','--brand2',
                 '--brandSoft','--warn','--warnSoft','--danger','--dangerSoft','--info','--infoSoft',
                 '--r','--sans','--mono'];
    var hcs = getComputedStyle(host);
    for (var k = 0; k < names.length; k++) vars.push(names[k] + '=' + hcs.getPropertyValue(names[k]).trim());

    /* The wrapper itself, and a plain element outside it. */
    var wcs = getComputedStyle(host);
    rows.push('WRAPPER|' + ['display','fontFamily','backgroundColor','color','lineHeight','boxSizing','overflowX'].map(function(p){return p+'='+wcs[p];}).join('|'));
    var plain = document.createElement('div');
    plain.innerHTML = '<button>x</button><a href="#">y</a><table><tr><td>z</td></tr></table>';
    document.body.appendChild(plain);
    var pcs = getComputedStyle(plain.querySelector('button'));
    rows.push('OUTSIDE-button|' + ['fontFamily','backgroundColor','color','borderRadius','padding'].map(function(p){return p+'='+pcs[p];}).join('|'));
    var as = getComputedStyle(plain.querySelector('a'));
    rows.push('OUTSIDE-a|' + ['color','textDecoration'].map(function(p){return p+'='+as[p];}).join('|'));
    var ts = getComputedStyle(plain.querySelector('table'));
    rows.push('OUTSIDE-table|' + ['display','width','borderCollapse','fontSize'].map(function(p){return p+'='+ts[p];}).join('|'));
    var bs = getComputedStyle(document.body);
    rows.push('BODY|' + ['fontFamily','backgroundColor','color','lineHeight','overflowX'].map(function(p){return p+'='+bs[p];}).join('|'));

    host.remove(); plain.remove();
    return rows.join('\\n') + '\\n---VARS---\\n' + vars.join('\\n');
  })()`);

  fs.writeFileSync(OUT, out, 'utf8');
  console.log('written', OUT, fs.statSync(OUT).size, 'bytes');
  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
