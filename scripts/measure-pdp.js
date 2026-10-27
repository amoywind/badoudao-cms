/* What is in the two columns of a product page, and how tall are they?
 *
 * The right column is the argument: the price, the minimum order, the
 * options, the estimator, the parameters, the buttons. The left is the
 * picture and the description. How tall each one is decides whether
 * the page reads as a page or as a column of text beside a picture.
 *
 * Usage: node scripts/measure-pdp.js [url]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/products/wood-wall-clocks/cute-wooden-totoro-pendulum-wall-clock-with-silent-movement';

(async () => {
  const port = 9900 + Math.floor(Math.random() * 20);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'pd' + port)}`], { stdio: 'ignore' });
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

  for (const w of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500
    });
    await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
    await new Promise(r => setTimeout(r, 4000));
    /* Wait for the layout to exist, not for a fixed number of seconds.
       A product page is heavy — the gallery, the estimator, the builder
       — and reading it before it has been laid out finds nothing. */
    for (let i = 0; i < 30; i++) {
      const has = await ev(`!!document.querySelector('.pd')`);
      if (has) break;
      await new Promise(r => setTimeout(r, 700));
    }
    await ev(`(function(){
      var s = performance.getEntriesByType('resource').filter(function(r){return r.name.indexOf('.css')>=0;});
      return s.length>0 && s.every(function(r){return r.responseEnd;});
    })()`);
    await new Promise(r => setTimeout(r, 1800));

    const out = await ev(`(function(){
      var pd = document.querySelector('.pd');
      var gallery = document.querySelector('.pd-gallery-area');
      var desc = document.querySelector('.pd-desc-area');
      var info = document.querySelector('.pd-info');
      if(!pd||!gallery||!desc||!info) return JSON.stringify({error:'the three areas are not all there'});
      var pcs = getComputedStyle(pd);
      var gr = gallery.getBoundingClientRect();
      var dr = desc.getBoundingClientRect();
      var ir = info.getBoundingClientRect();

      /* What is in each area, in order, with how tall it is. */
      function blocks(root){
        var out=[];
        var kids = root.children;
        for(var i=0;i<kids.length;i++){
          var el=kids[i];
          var r=el.getBoundingClientRect();
          var t=(el.innerText||'').trim().split('\\n')[0].slice(0,46);
          out.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className||'').toString().slice(0,34),
            h: Math.round(r.height),
            top: Math.round(r.top + window.scrollY),
            first: t
          });
        }
        return out;
      }

      /* Where each area actually begins on the page. The order they
         appear in is the order a reader meets them in. */
      var order = [
        { name: 'gallery', top: Math.round(gr.top + window.scrollY), h: Math.round(gr.height) },
        { name: 'info',    top: Math.round(ir.top + window.scrollY), h: Math.round(ir.height) },
        { name: 'desc',    top: Math.round(dr.top + window.scrollY), h: Math.round(dr.height) }
      ].sort(function(a,b){ return a.top - b.top; });

      return JSON.stringify({
        gridTemplate: pcs.gridTemplateColumns,
        gridAreas: pcs.gridTemplateAreas,
        gap: pcs.gap,
        galleryW: Math.round(gr.width), galleryH: Math.round(gr.height),
        descW: Math.round(dr.width), descH: Math.round(dr.height),
        infoW: Math.round(ir.width), infoH: Math.round(ir.height),
        order: order.map(function(o){ return o.name + '@' + o.top; }).join(' → '),
        galleryBlocks: blocks(gallery),
        descBlocks: blocks(desc),
        infoBlocks: blocks(info)
      });
    })()`);

    const d = JSON.parse(out);
    console.log('\n=== ' + w + 'px ===');
    if (d.error) { console.log(' ', d.error); continue; }
    console.log('  栅格      ' + d.gridTemplate + '   gap ' + d.gap);
    console.log('  出现顺序  ' + d.order);
    console.log('  画廊      ' + d.galleryW + ' x ' + d.galleryH);
    console.log('  描述      ' + d.descW + ' x ' + d.descH);
    console.log('  决策栏    ' + d.infoW + ' x ' + d.infoH);
    console.log('  左总高    ' + (d.galleryH + d.descH + 26) + '   决策栏 ' + d.infoH +
                '   差 ' + (d.infoH - (d.galleryH + d.descH + 26)) + 'px');

    console.log('\n  画廊区');
    d.galleryBlocks.forEach(b => console.log('    ' + String(b.h).padStart(5) + 'px  ' + b.cls.padEnd(34) + ' ' + b.first));
    console.log('\n  描述区');
    d.descBlocks.forEach(b => console.log('    ' + String(b.h).padStart(5) + 'px  ' + b.cls.padEnd(34) + ' ' + b.first));
    console.log('\n  决策栏');
    d.infoBlocks.forEach(b => console.log('    ' + String(b.h).padStart(5) + 'px  ' + b.cls.padEnd(34) + ' ' + b.first));
  }

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
