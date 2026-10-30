/* Verify the three corrections against the live site.
 *
 * 1. The hands: the minute hand must be longer than the hour hand, and
 *    nothing may stick out past the bezel.
 * 2. The home page must NOT carry the anatomy or the 28-day route.
 *    They live on the custom-services page, which is where a buyer
 *    goes to read about them.
 * 3. The 28-day route must run across on a desktop, and the anatomy
 *    must still be complete on the topic page.
 */
const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ✓ ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { fail++; console.log('  ✗ ' + name + '  — ' + (detail || '')); }
}

(async () => {
  const port = 9150 + Math.floor(Math.random() * 50);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'v3' + port)}`], { stdio: 'ignore' });
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/' });
  await new Promise(r => setTimeout(r, 5200));

  console.log('\n=== 1. The hands ===');
  const hands = JSON.parse(await ev(`(function(){
    var svg=document.querySelector('.clockface');
    if(!svg) return '{"err":"no svg"}';
    var out=[];
    var lines=svg.querySelectorAll('line');
    for(var i=0;i<lines.length;i++){
      var L=lines[i];
      var x1=parseFloat(L.getAttribute('x1')), y1=parseFloat(L.getAttribute('y1'));
      var x2=parseFloat(L.getAttribute('x2')), y2=parseFloat(L.getAttribute('y2'));
      var len=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
      var w=parseFloat(L.getAttribute('stroke-width'));
      // The tick marks are 1px or 2.5px wide; the hands are 4.5, 3.2 and 1.4.
      if(w===4.5||w===3.2||w===1.4||w===1.1){
        var g=L.closest('g');
        out.push({len:Math.round(len), w:w, stroke:L.getAttribute('stroke'),
                  rot:(g?g.getAttribute('transform'):L.getAttribute('transform'))||''});
      }
    }
    var b=svg.getBBox();
    return JSON.stringify({
      viewBox: svg.getAttribute('viewBox'),
      hands: out,
      bbox:{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}
    });
  })()`));

  const hh = hands.hands.find(h => h.w === 4.5);
  const mh = hands.hands.find(h => h.w === 3.2);
  const sh = hands.hands.find(h => h.w === 1.4);
  const tail = hands.hands.find(h => h.w === 1.1);

  check('clock: the hour hand is 54 units long', hh && hh.len === 54, hh ? hh.len + ' units' : 'not found');
  check('clock: the minute hand is 78 units long', mh && mh.len === 78, mh ? mh.len + ' units' : 'not found');
  check('clock: the minute hand is longer than the hour hand', mh && hh && mh.len > hh.len,
    mh && hh ? mh.len + ' vs ' + hh.len : 'missing');
  check('clock: the second hand reaches the minute track (90)', sh && sh.len === 90, sh ? sh.len + ' units' : 'not found');
  check('clock: the counterweight tail stays inside the dial', tail && tail.len < 114,
    tail ? tail.len + ' units' : 'not found');
  check('clock: the canvas is 240 square', hands.viewBox === '0 0 240 240', hands.viewBox);

  /* The dial itself is a circle of radius 114 centred on (120,120), so
     anything drawn beyond radius 114 is outside the bezel. The bbox of
     the whole drawing is the simplest way to catch a stray tail. */
  check('clock: nothing is drawn outside the 240 canvas',
    hands.bbox.x >= 0 && hands.bbox.y >= 0 &&
    hands.bbox.x + hands.bbox.w <= 240 && hands.bbox.y + hands.bbox.h <= 240,
    'bbox ' + JSON.stringify(hands.bbox));

  console.log('\n=== 2. The home page carries one product section and no modules ===');
  const home = JSON.parse(await ev(`(function(){
    /* The anatomy and the calendar are the subject of the
       custom-services page. The customizer is on a page of its own.
       The quick entry that used to link to it is gone too — the
       navigation goes straight there.

       The check is on the rendered text as well as the class names:
       the kicker "// Custom services & anatomy" is what a reader
       sees, and a heading that survived while its block was removed
       would still be a module on the page. */
    var body=document.body.innerText||'';
    return JSON.stringify({
      hasHubAnatomy: !!document.querySelector('.hub-anatomy'),
      hasAnatomySvg: !!document.querySelector('.anx-svg'),
      hasRoute: !!document.querySelector('.route'),
      hasAnatomyHeading: body.indexOf('6 Core Modular Components') >= 0,
      hasRouteHeading: body.indexOf('Twenty-eight days from drawing to container') >= 0,
      hasAnatomyKicker: body.indexOf('Custom services & anatomy') >= 0,
      hasRouteKicker: body.indexOf('Agile manufacturing timeline') >= 0,
      hasHub: !!document.querySelector('.hub'),
      hasHubTabs: document.querySelectorAll('.hub-tab').length,
      hasEntry: !!document.querySelector('.hub-entry'),
      /* The product sections. There was a materials grid and a
         trending grid; the trending one showed four products that
         were all inside the six families, so it was the same
         photography twice. */
      matCards: document.querySelectorAll('.mat-card').length,
      trendCards: document.querySelectorAll('.trend-card').length,
      hasTrendingHeading: body.indexOf('Trending base shells') >= 0,
      hasEntryHeading: body.indexOf('Four decisions, one specification') >= 0,
      matColumns: (function(){
        var g=document.querySelector('.mat-grid');
        if(!g) return 0;
        return getComputedStyle(g).gridTemplateColumns.split(' ').length;
      })(),
      hasOverflown: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`));

  check('home: the anatomy block is gone', !home.hasHubAnatomy);
  check('home: the exploded drawing is gone', !home.hasAnatomySvg);
  check('home: the 28-day route is gone', !home.hasRoute);
  check('home: the anatomy heading is gone', !home.hasAnatomyHeading);
  check('home: the route heading is gone', !home.hasRouteHeading);
  check('home: the anatomy kicker is gone', !home.hasAnatomyKicker);
  check('home: the route kicker is gone', !home.hasRouteKicker);
  check('home: the full customizer is not on the home page', !home.hasHub && home.hasHubTabs === 0,
    home.hasHubTabs + ' tabs');
  check('home: the quick entry is gone too', !home.hasEntry);
  check('home: the quick entry heading is gone', !home.hasEntryHeading);
  /* Eight material families now — marble and 3D printing were added to
     the catalogue — and they are laid out four across and two down
     rather than eight in one row, because a card eight across holds a
     name, a sentence and a count in three cramped lines. */
  check('home: the eight material families are there', home.matCards === 8, home.matCards + ' cards');
  check('home: they are four across on a desktop', home.matColumns === 4,
    home.matColumns + ' columns');
  check('home: the trending section is gone', home.trendCards === 0 && !home.hasTrendingHeading);
  check('home: no horizontal overflow', !home.hasOverflown);

  console.log('\n=== 3. The customizer page carries the tool and sends the buyer to the form ===');
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/customizer' });
  await new Promise(r => setTimeout(r, 5000));
  const cz = JSON.parse(await ev(`(function(){
    var hub=document.querySelector('.hub');
    var spec=document.getElementById('spec');
    var form=document.querySelector('form');
    var code=document.querySelector('.hub-code');
    var cta=document.querySelector('.inq-cta a');
    return JSON.stringify({
      hasHub: !!hub,
      hubTabs: document.querySelectorAll('.hub-tab').length,
      hubOpts: document.querySelectorAll('.hub-opt').length,
      hasForm: !!form,
      hasCta: !!cta,
      ctaHref: cta?cta.getAttribute('href'):null,
      shown: code?code.textContent.trim():'',
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`));

  check('customizer page: the tool renders', cz.hasHub);
  check('customizer page: all four tabs are present', cz.hubTabs === 4, cz.hubTabs + ' tabs');
  check('customizer page: the options render', cz.hubOpts >= 3, cz.hubOpts + ' options');
  /* The form lives on the contact page now, so the customiser carries a
     link to it. The check that matters is not that the link is there
     but that pressing apply arrives with the configuration — which is
     what the next block does. */
  check('customizer page: the enquiry form is not on the page', !cz.hasForm);
  check('customizer page: there is a link to the enquiry instead', !!cz.hasCta);
  check('customizer page: the link goes to the contact page',
    (cz.ctaHref || '').indexOf('/contact') === 0, cz.ctaHref);
  check('customizer page: the specification is shown on screen', cz.shown.length > 0, cz.shown);
  check('customizer page: no horizontal overflow', !cz.overflow);

  /* Press apply and see what arrives at the form. */
  await ev(`(function(){ var b=document.querySelector('.hub-apply'); if(b) b.click(); return 1; })()`);
  await new Promise(r => setTimeout(r, 3000));
  const ca = JSON.parse(await ev(`(function(){
    var msg=document.getElementById('if-msg');
    var spec=document.getElementById('spec');
    return JSON.stringify({
      url: location.pathname+location.search,
      msg: msg?msg.value:'',
      spec: spec?spec.value:''
    });
  })()`));

  check('customizer page: apply leads to the contact page', ca.url.indexOf('/contact') === 0, ca.url);
  check('customizer page: the configuration arrives in the message box',
    ca.msg.indexOf('Configuration:') >= 0, ca.msg.slice(0, 60));
  check('customizer page: the specification code arrives with it',
    ca.spec.length > 0, ca.spec);

  console.log('\n=== 4. The custom-services page carries both ===');
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/custom-services' });
  await new Promise(r => setTimeout(r, 4500));
  const anat = JSON.parse(await ev(`(function(){
    var svg=document.querySelector('.anx-svg');
    var tabs=document.querySelectorAll('.anx-tab');
    var callouts=document.querySelectorAll('.anx-callout');
    var panel=document.querySelector('.anx-panel');
    var kicker=document.querySelector('.anx-kicker');
    var h=document.querySelector('.anx-h');
    var route=document.querySelector('.anx-route');
    return JSON.stringify({
      hasRoute: !!route,
      hasSvg: !!svg,
      tabCount: tabs.length,
      calloutCount: callouts.length,
      hasPanel: !!panel,
      kicker: kicker ? kicker.textContent.trim() : '',
      title: h ? h.textContent.trim() : ''
    });
  })()`));

  check('topic page: the 28-day route is there', anat.hasRoute);
  check('topic page: the exploded drawing renders', anat.hasSvg);
  check('topic page: all six part tabs are present', anat.tabCount === 6, anat.tabCount + ' tabs');
  check('topic page: all six callouts are present', anat.calloutCount === 6, anat.calloutCount + ' callouts');
  check('topic page: the engineering panel is there', anat.hasPanel);
  check('topic page: the kicker names the part', /part 0[0-9]/i.test(anat.kicker), anat.kicker);
  check('topic page: the title names the component', /Dial Face|Outer Frame|Lens|Hands|Movement|Backplate/i.test(anat.title), anat.title);

  console.log('\n=== 5. The 28-day route runs across ===');
  const route = JSON.parse(await ev(`(function(){
    var r=document.querySelector('.route');
    if(!r) return '{"err":"no route"}';
    var items=document.querySelectorAll('.route-i');
    var tops=[];
    for(var i=0;i<items.length;i++){
      var b=items[i].getBoundingClientRect();
      tops.push(Math.round(b.top));
    }
    var firstTop=tops[0];
    var sameRow=tops.every(function(t){return Math.abs(t-firstTop)<40;});
    var rb=r.getBoundingClientRect();
    return JSON.stringify({
      count: items.length,
      sameRow: sameRow,
      tops: tops,
      width: Math.round(rb.width),
      cols: getComputedStyle(r).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`));

  check('route: six stages', route.count === 6, route.count + ' stages');
  check('route: they sit on one row on a desktop', route.sameRow, 'columns=' + route.cols + ' tops=' + JSON.stringify(route.tops));
  check('route: no horizontal overflow', !route.overflow);

  console.log('\n=== 6. On a phone the route becomes a column ===');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'https://www.oemwallclocks.com/custom-services' });
  await new Promise(r => setTimeout(r, 4500));
  const mRoute = JSON.parse(await ev(`(function(){
    var r=document.querySelector('.route');
    if(!r) return '{"err":"no route"}';
    var items=document.querySelectorAll('.route-i');
    var tops=[];
    for(var i=0;i<items.length;i++){ tops.push(Math.round(items[i].getBoundingClientRect().top)); }
    var stacked = true;
    for(var j=1;j<tops.length;j++){ if(tops[j] <= tops[j-1]+10) stacked=false; }
    return JSON.stringify({
      stacked: stacked,
      cols: getComputedStyle(r).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`));
  check('route: it stacks on a phone', mRoute.stacked, 'columns=' + mRoute.cols);
  check('route: no horizontal overflow on a phone', !mRoute.overflow);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  ws.close(); try { process.kill(proc.pid); } catch {}
  process.exit(fail > 0 ? 1 : 0);
})();
