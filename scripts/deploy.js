/**
 * Trigger a Cloudflare Pages deployment and wait for it.
 *
 * GitHub's git transport is unreliable on this network, so commits are
 * pushed through the REST API (see push-via-tree.js). Deployments are
 * driven the same way: rather than pressing a button in the dashboard, the
 * build is started from its commit hash and polled until it settles.
 *
 * Usage:
 *   node scripts/deploy.js          # deploy current remote main
 *   node scripts/deploy.js --wait 60
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const PROJECT = process.env.CF_PROJECT || 'badoudao-site';

function cfToken() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN.trim();
  const v = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
  const m = v.match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m);
  if (!m) throw new Error('No Cloudflare token in .dev.vars');
  return m[1].trim();
}

function ghToken() {
  const v = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
  const m = v.match(/^GH_TOKEN=(.+)$/m);
  return m ? m[1].trim() : '';
}

const CF = { Authorization: `Bearer ${cfToken()}`, 'Content-Type': 'application/json' };

async function cf(pathname, init) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}${pathname}`,
    init
  );
  return res.json();
}

async function remoteHead() {
  const tok = ghToken();
  if (!tok) return '';
  const res = await fetch(
    'https://api.github.com/repos/amoywind/badoudao-cms/git/ref/heads/main',
    { headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' } }
  );
  const j = await res.json();
  return (j.object && j.object.sha) || '';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const waitArg = process.argv.indexOf('--wait');
  const maxMin = waitArg > 0 ? Number(process.argv[waitArg + 1]) || 6 : 6;

  const sha = await remoteHead();
  if (!sha) throw new Error('无法读取远端 HEAD');

  console.log(`目标 commit: ${sha.slice(0, 7)}`);

  const dep = await cf(`/pages/projects/${PROJECT}/deployments`, {
    method: 'POST',
    headers: CF,
    body: JSON.stringify({ branch: 'main', commit_hash: sha })
  });

  if (!dep.success) {
    console.error('触发失败:', JSON.stringify(dep.errors || dep).slice(0, 300));
    process.exit(1);
  }

  const id = dep.result.id;
  console.log(`部署已触发 ${id}`);

  /* Poll until the deploy stage reports success or failure. Note the field
     is `status`, not `state`. */
  const deadline = Date.now() + maxMin * 60_000;
  while (Date.now() < deadline) {
    await sleep(15_000);
    const s = await cf(`/pages/projects/${PROJECT}/deployments/${id}`);
    const stage = s.result && s.result.latest_stage;
    if (!stage) continue;

    console.log(`  ${new Date().toLocaleTimeString('zh-CN')}  ${stage.name} → ${stage.status}`);

    if (stage.status === 'failure') {
      const logs = await cf(`/pages/projects/${PROJECT}/deployments/${id}/history/logs`);
      const lines = (logs.result || []).slice(-40).map((l) => l.line);
      console.error('\n构建失败日志尾部:\n' + lines.join('\n'));
      process.exit(1);
    }
    if (stage.status === 'success' && stage.name === 'deploy') {
      console.log('✓ 部署完成');
      return;
    }
  }

  console.error('超时，仍在构建中');
  process.exit(1);
}

main().catch((e) => {
  console.error('部署失败:', e.message);
  process.exit(1);
});
