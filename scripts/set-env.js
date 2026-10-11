/**
 * Set Pages environment variables via the Cloudflare API.
 *
 * Secrets are written with the encrypted:true flag so they are stored
 * encrypted at rest and never returned in plain text.
 *
 * Usage: node set-env.js <KEY=value> [<KEY=value> ...]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEV_VARS = path.join(ROOT, '.dev.vars');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const PROJECT = process.env.CF_PROJECT || 'badoudao-site';

/* values that must be encrypted at rest */
const SECRET_KEYS = new Set(['ADMIN_PASSWORD', 'RESEND_API_KEY']);

function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const m = fs.readFileSync(DEV_VARS, 'utf8').match(/^CLOUDFLARE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error('CLOUDFLARE_API_TOKEN not found in .dev.vars');
  return m[1].trim();
}

async function main() {
  const pairs = process.argv.slice(2);
  if (!pairs.length) {
    console.error('Usage: node set-env.js <KEY=value> ...');
    process.exit(1);
  }

  const token = readToken();
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}/env`;

  /* plain vars first, then secrets — Cloudflare applies each request atomically */
  const plain = {};
  const secrets = {};

  for (const p of pairs) {
    const i = p.indexOf('=');
    if (i === -1) { console.error(`跳过无效格式: ${p}`); continue; }
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    if (SECRET_KEYS.has(k)) secrets[k] = v;
    else plain[k] = v;
  }

  async function send(body, label) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      console.error(`  ✗ ${label}: ${json.errors.map((e) => e.message).join('; ')}`);
      process.exit(1);
    }
    console.log(`  ✓ ${label}`);
  }

  console.log(`\n设置 ${PROJECT} 的环境变量\n`);

  if (Object.keys(secrets).length) {
    await send(
      { merge: true, encrypted: Object.keys(secrets).map((k) => ({ name: k, text: secrets[k] })) },
      `加密变量: ${Object.keys(secrets).join(', ')}`
    );
  }

  if (Object.keys(plain).length) {
    await send({ merge: true, plain_text: Object.keys(plain).map((k) => ({ name: k, text: plain[k] })) }, `普通变量: ${Object.keys(plain).join(', ')}`);
  }

  /* verify — the API returns either an array or { result: [...] } depending
     on the endpoint version, so normalise before iterating */
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (json.success) {
    const raw = json.result;
    const list = Array.isArray(raw) ? raw : (raw?.result || raw?.env || []);
    console.log(`\n当前变量（${list.length} 个）:`);
    for (const v of list) {
      const t = v.type || (v.text ? 'plain_text' : '?');
      const shown = t === 'secret_text' ? '(加密)' : (v.text ?? v.value ?? '');
      console.log(`  ${String(v.name).padEnd(20)} ${shown}`);
    }
  } else {
    console.log(`\n（已写入，但回读验证失败：${json.errors?.[0]?.message || '未知'}）`);
  }
  console.log();
}

main().catch((e) => { console.error('\n错误:', e.message, '\n'); process.exit(1); });