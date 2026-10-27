/**
 * Check the parts of a product page that only exist after the browser runs.
 *
 * The gallery, its zoom, the lightbox and the thumbnail strip are client
 * components, so the server-rendered HTML carries only the mount point. A
 * source-level check and an HTML-level check both pass while those are
 * broken, which is how a gallery can ship that never opens.
 *
 * Opens the page, waits for hydration, then reads the computed styles and
 * exercises the controls: hover the frame, click to open the lightbox,
 * press Escape, click a customisation option.
 *
 *   node scripts/check-pdp-live.js [url]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9401;
const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock';

const profile = path.join(os.tmpdir(), `pdp-live-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => {
  http.get(u, (r) => {
    let b = '';
    r.on('data', (c) => (b += c));
    r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

/* Runs in the page: reads the boxes, then drives the controls and reports
   what changed. Doing it here rather than over CDP keeps the timing with
   React's re-render, which is what actually broke in the first place. */
const PROBE = `(async () => {
  const out = {};
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const main = document.querySelector('.pd-main');
  out.hasMain = !!main;

  if (main) {
    const cs = getComputedStyle(main);
    const r = main.getBoundingClientRect();
    out.aspect = cs.aspectRatio;
    out.ratio = r.height > 0 ? (r.width / r.height).toFixed(2) : '0';
    out.overflow = cs.overflow;

    out.mainBox = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }

  /* Lightbox opens on click and closes on Escape. */
  const openBtn = document.querySelector('.pd-main-btn');
  out.hasOpenBtn = !!openBtn;
  if (openBtn) {
    openBtn.click();
    await wait(350);
    const lb = document.querySelector('.pd-lightbox');
    out.lightboxOpens = !!lb;
    if (lb) {
      out.lbImg = !!lb.querySelector('img');
      out.scrollLocked = document.body.style.overflow === 'hidden';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await wait(300);
      out.lightboxCloses = !document.querySelector('.pd-lightbox');
      out.scrollRestored = document.body.style.overflow !== 'hidden';
    }
  }

  /* Customisation: a click must mark the option and change the hidden
     field, because that field is what reaches the inquiry. */
  const opts = [...document.querySelectorAll('.pd-op')];
  out.optionCount = opts.length;
  const hidden = document.querySelector('input[name="configuration"]');
  out.hasConfigField = !!hidden;

  const metal = opts.find(o => /Metal/.test(o.textContent || ''));
  if (metal) {
    const before = hidden ? hidden.value : '';
    metal.querySelector('input').click();
    await wait(200);
    out.optionSelects = metal.className.includes('on');
    out.configCarries = hidden ? hidden.value !== before : false;
    out.configSample = hidden ? hidden.value.slice(0, 60) : '';
  }

  /* Group counts, and whether the groups are real radio/checkbox inputs
     rather than divs that only look selectable. */
  out.groups = document.querySelectorAll('.pd-opgroup').length;
  out.realInputs = document.querySelectorAll('.pd-op input[type=radio], .pd-op input[type=checkbox]').length;
  out.inputsInTabOrder = [...document.querySelectorAll('.pd-op input')]
    .filter(i => i.offsetParent !== null || i.getClientRects().length > 0 || i.tabIndex >= 0).length;

  /* FAQ: details must toggle. */
  const det = document.querySelector('.pd-faq-i');
  out.faqFound = !!det;
  if (det) {
    const b = det.open;
    det.querySelector('summary').click();
    await wait(200);
    out.faqToggles = det.open !== b;
  }

  return JSON.stringify(out);
})()`;

/* Exposed so the harness can drive the pointer for real. Synthetic
   mouseout carries no relatedTarget, so React's delegated leave handler
   cannot tell the pointer left — it needs an actual move. */

(async () => {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1400,1000', URL_
  ], { stdio: 'ignore', detached: true });

  let target = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const list = await getJSON(`http://127.0.0.1:${PORT}/json/list`);
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch {}
  }
  if (!target) { console.log('无法连接浏览器'); process.exit(2); }

  const WebSocket = require('ws');
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((res) => {
    const n = ++id; pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  await new Promise((r) => ws.on('open', r));
  await send('Page.enable');
  await send('Page.navigate', { url: `${URL_}?t=${Date.now()}` });
  await sleep(6000);

  const res = await send('Runtime.evaluate', { expression: PROBE, awaitPromise: true, returnByValue: true });
  const raw = res.result?.result?.value;
  let d0 = {};
  try { d0 = JSON.parse(raw || '{}'); } catch {}

  /* Hover driven through CDP rather than dispatchEvent.
     React 17+ delegates mouseenter/mouseleave onto mouseover/mouseout and
     decides whether the pointer left by reading event.relatedTarget. A
     synthetic MouseEvent has none, so the handler concludes the pointer is
     still inside and never clears the zoom class — the test would report a
     stuck zoom that no user can reproduce, because a real pointer always
     carries a related target. */
  let zoomIn = false, zoomOut = false, origin = '', t1 = '', t2 = '';
  if (d0.mainBox) {
    const b = d0.mainBox;
    const cx = b.x + Math.round(b.w * 0.35);
    const cy = b.y + Math.round(b.h * 0.35);

    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx - 200, y: cy, buttons: 0 });
    await sleep(120);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, buttons: 0 });
    await sleep(400);

    let r = await send('Runtime.evaluate', {
      expression: `(() => { const m=document.querySelector('.pd-main'),i=m&&m.querySelector('img');
        return JSON.stringify({ c: m?m.className:'', t: i?getComputedStyle(i).transform:'none', o: i?i.style.transformOrigin:'' }); })()`,
      returnByValue: true
    });
    let v = JSON.parse(r.result?.result?.value || '{}');
    zoomIn = /zoom/.test(v.c || ''); origin = v.o || ''; t1 = v.t || '';

    /* Now move well outside the frame. */
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x - 260, y: b.y - 120, buttons: 0 });
    await sleep(450);

    r = await send('Runtime.evaluate', {
      expression: `(() => { const m=document.querySelector('.pd-main'),i=m&&m.querySelector('img');
        return JSON.stringify({ c: m?m.className:'', t: i?getComputedStyle(i).transform:'none' }); })()`,
      returnByValue: true
    });
    v = JSON.parse(r.result?.result?.value || '{}');
    zoomOut = !/zoom/.test(v.c || ''); t2 = v.t || '';
  }

  try { process.kill(-edge.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!raw) { console.log('探测未返回'); process.exit(2); }
  const d = JSON.parse(raw);
  d.zoomOnHover = zoomIn; d.zoomOff = zoomOut; d.origin = origin || d.origin;
  d.transformBefore = t1 || d.transformBefore; d.transformAfter = t2 || t2;

  let pass = 0, fail = 0;
  const t = (name, ok, note) => {
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? 'OK  ' : 'NG  '} ${name}${note ? '  ' + note : ''}`);
  };

  console.log('\n图集（浏览器实测）\n');
  t('主图存在', d.hasMain);
  t('1:1 正方形', d.ratio === '1.00' || d.aspect === '1 / 1', `宽高比 ${d.ratio}`);
  t('Hover 放大', d.zoomOnHover, `transform ${d.transformBefore}`);
  t('缩放跟随指针', !!d.origin, d.origin);
  t('移出后复位', d.zoomOff);

  console.log('\nLightbox\n');
  t('点击可打开', d.lightboxOpens);
  t('内含图片', d.lbImg);
  t('打开时锁定滚动', d.scrollLocked);
  t('Escape 可关闭', d.lightboxCloses);
  t('关闭后恢复滚动', d.scrollRestored);

  console.log('\n定制选项\n');
  t('六组选项', d.groups === 6, `${d.groups} 组`);
  t('选项总数 ≥ 25', d.optionCount >= 25, `${d.optionCount} 个`);
  t('使用真实 input', d.realInputs === d.optionCount, `${d.realInputs}/${d.optionCount}`);
  t('可点击选中', d.optionSelects);
  t('选择进入询盘字段', d.hasConfigField && d.configCarries, d.configSample || '(空)');

  console.log('\nFAQ\n');
  t('手风琴可展开', d.faqFound && d.faqToggles);

  console.log(`\n通过 ${pass}，失败 ${fail}。`);
  process.exit(fail === 0 ? 0 : 1);
})();