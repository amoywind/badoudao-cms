#!/usr/bin/env node
/* Deployment status, one command.
 *
 * `deploy.js` can give up waiting before Cloudflare finishes; it prints a
 * deployment id when it does. This is the thing to run next: pass that id
 * to see the stage, or pass nothing to list the recent deployments so the
 * newest one can be identified by commit.
 *
 *   node scripts/deploy-status.js            # last 5 deployments
 *   node scripts/deploy-status.js <id>       # one deployment + log tail
 *   node scripts/deploy-status.js <id> --log # force the log tail
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const PROJECT = process.env.CF_PROJECT || 'badoudao-site';

function token() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN.trim();
  const m = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').match(/^CLOUDFLARE_API_TOKEN\s*=\s*(\S+)/m);
  if (!m) throw new Error('CLOUDFLARE_API_TOKEN not found in .dev.vars');
  return m[1].trim();
}

const H = { Authorization: 'Bearer ' + token() };
const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}`;

async function cf(p) {
  const r = await fetch(base + p, { headers: H });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j.result;
}

async function main() {
  const id = process.argv[2];
  const wantLog = process.argv.includes('--log');

  if (!id) {
    const list = await cf('/deployments');
    for (const d of list.slice(0, 5)) {
      const st = d.latest_stage || {};
      const sha = (d.deployment_trigger?.metadata?.commit_hash || '').slice(0, 7) || '—';
      console.log(
        `${d.id.slice(0, 8)}  ${String(st.name || '?').padEnd(10)} ` +
        `${String(st.status || '?').padEnd(9)} ${sha.padEnd(8)} ${d.created_on}`
      );
    }
    return;
  }

  const d = await cf(`/deployments/${id}`);
  const st = d.latest_stage || {};
  console.log(`id     : ${d.id}`);
  console.log(`commit : ${(d.deployment_trigger?.metadata?.commit_hash || '').slice(0, 7)}`);
  console.log(`stage  : ${st.name} → ${st.status}`);
  console.log(`url    : ${d.url || '(not assigned yet)'}`);

  if (wantLog || st.status === 'failure') {
    const logs = await cf(`/deployments/${id}/history/logs`);
    const lines = (logs || []).map((l) => l.line);
    console.log('\n--- log tail ---');
    console.log(lines.slice(-60).join('\n'));
  }

  /* Exit non-zero only on a real failure verdict, so this is usable in a
     shell test without being confused by "still building". */
  if (st.status === 'failure') process.exit(1);
}

main().catch((e) => {
  console.error('查询失败:', e.message);
  process.exit(1);
});
