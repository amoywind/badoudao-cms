/* What does a search engine's crawler see, and how fast?
 *
 * The question is whether the code is worth restructuring for SEO.
 * That turns on three measurements: how big the page is, how fast the
 * largest thing on it appears, and how much the page jumps around
 * while it loads. The last two are Core Web Vitals, and Google reads
 * them.
 *
 * LCP is the largest picture or block of text, and it is reported as
 * the last candidate to paint rather than the first, because a late
 * element that is larger wins.
 *
 * CLS is the total of every unexpected movement of anything already
 * on the page. A picture with no width and height reserves no space
 * and pushes everything below it down when it arrives.
 *
 * Usage: node scripts/check-vitals.js [url]
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/';

(async () => {
  const port = 9800 + Math.floor(Math.random() * 30);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'v' + port)}`], { stdio: 'ignore' });
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
  await send('Network.enable', {});
  await send('Performance.enable', {});

  /* Watch for layout shifts before the page is asked for. */
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__cls = 0;
      window.__shifts = [];
      new PerformanceObserver(function(list){
        list.getEntries().forEach(function(e){
          if(!e.hadRecentInput){
            window.__cls += e.value;
            window.__shifts.push({v: Math.round(e.value*10000)/10000,
              sources: (e.sources||[]).map(function(s){
                var n = s.node;
                return n ? (n.tagName||'') + '.' + ((n.className||'').toString().split(' ')[0]||'') : '?';
              })});
          }
        });
      }).observe({type:'layout-shift', buffered:true});

      window.__lcp = 0;
      window.__lcpEl = '';
      new PerformanceObserver(function(list){
        var es = list.getEntries();
        var last = es[es.length-1];
        if(last){
          window.__lcp = last.startTime;
          window.__lcpEl = last.element ? (last.element.tagName||'') + '.' +
            ((last.element.className||'').toString().split(' ')[0]||'') : '?';
        }
      }).observe({type:'largest-contentful-paint', buffered:true});
    `
  });

  let bytes = { html: 0, css: 0, js: 0, img: 0, other: 0 };
  const byType = (t) => {
    if (t === 'Document') return 'html';
    if (t === 'Stylesheet') return 'css';
    if (t === 'Script') return 'js';
    if (t === 'Image' || t === 'Media') return 'img';
    return 'other';
  };
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.method === 'Network.loadingFinished' && m.params.type) {
      const k = byType(m.params.type);
      if (k) bytes[k] += m.params.encodedDataLength || 0;
    }
  });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });

  const t0 = Date.now();
  await send('Page.navigate', { url: URL_ });
  await new Promise(r => setTimeout(r, 9000));

  /* Scroll through, so the lazy images are asked for and the page is
     seen in the state a reader would scroll it in. */
  const H = await send('Page.getLayoutMetrics', {});
  const pageH = Math.ceil(H.cssContentSize?.height || 0);
  for (let y = 0; y < pageH; y += 900) {
    await ev('window.scrollTo(0,' + y + ')');
    await new Promise(r => setTimeout(r, 200));
  }
  await ev('window.scrollTo(0,0)');
  await new Promise(r => setTimeout(r, 1500));

  const out = JSON.parse(await ev(`(function(){
    var nav = performance.getEntriesByType('navigation')[0] || {};
    var paints = {};
    performance.getEntriesByType('paint').forEach(function(p){ paints[p.name]=Math.round(p.startTime); });

    /* The resources the browser actually waited for, and when each
       one arrived. A stylesheet that finishes late delays the first
       paint, because the page cannot be drawn until the rules that
       govern it have arrived. */
    var res = performance.getEntriesByType('resource').map(function(r){
      return {
        name: r.name.split('/').pop().slice(0,52),
        kind: r.initiatorType,
        start: Math.round(r.startTime),
        end: Math.round(r.responseEnd),
        size: r.encodedBodySize || r.transferSize || 0
      };
    });
    /* A stylesheet is a file whose name ends in .css, whatever the
       browser calls its initiator. */
    var css = res.filter(function(r){ return r.name.indexOf('.css')>=0; });
    var js  = res.filter(function(r){ return r.kind==='script' || r.kind==='fetch'; });

    /* The render-blocking stylesheets, in the order they finished. */
    var cssEnd = css.length ? Math.max.apply(null, css.map(function(c){return c.end;})) : 0;

    return JSON.stringify({
      lcp: Math.round(window.__lcp),
      lcpEl: window.__lcpEl,
      cls: Math.round(window.__cls*10000)/10000,
      shifts: (window.__shifts||[]).slice(0,5),
      ttfb: Math.round(nav.responseStart || 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      paints: paints,
      domNodes: document.querySelectorAll('*').length,
      htmlSize: (document.documentElement.outerHTML||'').length,
      css: css,
      cssEnd: cssEnd,
      cssBytes: css.reduce(function(a,c){return a+c.size;},0),
      cssCount: css.length,
      jsBytes: js.reduce(function(a,c){return a+c.size;},0),
      jsCount: js.length
    });
  })()`));

  const total = bytes.html + bytes.css + bytes.js + bytes.img + bytes.other;
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';

  console.log('\n=== ' + URL_ + ' ===');

  console.log('\n核心指标');
  console.log('  TTFB          ' + out.ttfb + ' ms');
  console.log('  FCP           ' + (out.paints['first-contentful-paint'] ?? '-') + ' ms');
  console.log('  LCP           ' + out.lcp + ' ms  (' + out.lcpEl + ')');
  console.log('  CLS           ' + out.cls);
  console.log('  DOMContentLoaded ' + out.domContentLoaded + ' ms');
  console.log('  load          ' + out.loadEvent + ' ms');

  console.log('\n样式（阻塞首屏绘制）');
  console.log('  数量          ' + out.cssCount + ' 个文件，' + kb(out.cssBytes));
  console.log('  全部到达      ' + out.cssEnd + ' ms');
  out.css.forEach(c => console.log('    ' + c.name.padEnd(54) +
    (c.size / 1024).toFixed(1).padStart(7) + ' KB   ' +
    c.start + '→' + c.end + ' ms'));

  console.log('\n脚本');
  console.log('  数量          ' + out.jsCount + ' 个，' + kb(out.jsBytes));

  console.log('\n结构');
  console.log('  DOM 节点      ' + out.domNodes);
  console.log('  渲染后 HTML   ' + kb(out.htmlSize));

  if (out.shifts && out.shifts.length) {
    console.log('\n布局跳动');
    out.shifts.forEach(s => console.log('  ' + s.v + '  ' + (s.sources || []).join(', ')));
  } else {
    console.log('\n布局跳动       无');
  }

  const lg = out.lcp <= 2500 ? '好' : out.lcp <= 4000 ? '需改进' : '差';
  const cg = out.cls <= 0.1 ? '好' : out.cls <= 0.25 ? '需改进' : '差';
  console.log('\n评级  LCP ' + lg + ' / CLS ' + cg);

  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(0);
})();
