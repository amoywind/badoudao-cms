/**
 * Exercise the markdown editor's toolbar in a real browser.
 *
 * The complaint was that the buttons do nothing. A toolbar's whole job is
 * the interaction between a button and a textarea's selection, which
 * cannot be checked by reading the component: the failure mode is in
 * whether the selection survives the click, and that only happens live.
 *
 * Signs a button before, after, and applies H2, bold, list and quote to a
 * known selection, reporting what changed.
 *
 *   node scripts/test-editor.js [url]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9377;
const profile = path.join(os.tmpdir(), `edtest-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => {
  http.get(u, (r) => {
    let b = '';
    r.on('data', (c) => (b += c));
    r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

/* Sets a known value, places the caret inside a word, clicks a tool and
   returns the resulting text. Done inside the page so no timing between
   React's re-render and the selection restore can be missed. */
const TEST = `(async () => {
  const ta = document.querySelector('.md-input');
  const bar = document.querySelector('.md-tools');
  if (!ta) return JSON.stringify({ error: 'no .md-input' });
  if (!bar) return JSON.stringify({ error: 'no .md-tools' });

  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value').set;

  const results = [];

  const cases = [
    { key: 'h2', label: 'H2', sample: 'Incoming Material Inspection' },
    { key: 'h3', label: 'H3', sample: 'Incoming Material Inspection' },
    { key: 'bold', label: 'B', sample: 'stable quality' },
    { key: 'em', label: 'I', sample: 'stable quality' },
    { key: 'ul', label: '• 列表', sample: 'First line\nSecond line' },
    { key: 'ol', label: '1. 列表', sample: 'First line\nSecond line' },
    { key: 'quote', label: '❝', sample: 'A quoted sentence.' },
    { key: 'link', label: '🔗', sample: 'click here' },
    { key: 'table', label: '表格', sample: '' }
  ];

  for (const c of cases) {
    const btn = [...bar.querySelectorAll('button')]
      .find(b => b.title && (b.title === c.label || b.textContent.trim() === c.label));
    if (!btn) { results.push({ key: c.key, status: 'NO BUTTON' }); continue; }

    /* React does not see a direct .value assignment. */
    setter.call(ta, c.sample);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));

    const before = ta.value;
    /* Select the first word, which is what a writer does before hitting B. */
    const end = c.sample.indexOf(' ') > 0 ? c.sample.indexOf(' ') : c.sample.length;
    ta.focus();
    ta.setSelectionRange(0, end);

    btn.click();
    await new Promise(r => setTimeout(r, 120));

    const after = ta.value;
    results.push({
      key: c.key,
      status: after === before ? 'NO CHANGE' : 'ok',
      before: before.slice(0, 46),
      after: after.slice(0, 60),
      changed: after !== before
    });
  }

  return JSON.stringify({ results });
})()`;

(async () => {
  const url = process.argv[2];
  if (!url) { console.log('用法: node scripts/test-editor.js <后台页面URL>'); process.exit(2); }

  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1400,1000', url
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

  let WebSocket;
  try { WebSocket = require('ws'); } catch { console.log('需要 ws 模块'); process.exit(2); }

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
  await sleep(2500);

  const res = await send('Runtime.evaluate', {
    expression: TEST, awaitPromise: true, returnByValue: true
  });

  const raw = res.result?.result?.value;
  try { process.kill(-edge.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!raw) { console.log('测试脚本未返回结果'); process.exit(2); }

  const d = JSON.parse(raw);
  if (d.error) { console.log('错误:', d.error); process.exit(2); }

  console.log('\n编辑器工具栏测试\n');
  let broken = 0;
  for (const r of d.results) {
    if (!r.changed) broken++;
    console.log(`  ${r.changed ? 'OK  ' : 'NG  '} ${r.key.padEnd(7)} ${r.status}`);
    if (r.before !== undefined) {
      console.log(`        前: ${JSON.stringify(r.before)}`);
      console.log(`        后: ${JSON.stringify(r.after)}`);
    }
  }
  console.log(broken === 0 ? '\n全部按钮正常。' : `\n${broken} 个按钮无效。`);
  process.exit(broken === 0 ? 0 : 1);
})();