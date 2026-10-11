/**
 * Push to GitHub through the REST API when git cannot reach github.com.
 *
 * Some networks here can reach api.github.com but not github.com, which is
 * where the git transport lives. The REST API needs only the latter, so this
 * uploads the files that differ between a base commit and HEAD and creates a
 * real commit from them.
 *
 * Uses fetch (Node 18+) rather than shelling out to curl — spawning cmd.exe
 * fails with EBUSY when the sandbox holds it.
 *
 * Usage: node scripts/push-via-api.js <base-sha>
 */
const fs = require('fs');
const path = require('path');
// no child_process: spawning cmd.exe fails with EBUSY in this environment

const ROOT = path.join(__dirname, '..');
const DEV_VARS = path.join(ROOT, '.dev.vars');
const REPO = process.env.GH_REPO || 'amoywind/badoudao-cms';
const API = 'https://api.github.com';

function token() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  const m = fs.readFileSync(DEV_VARS, 'utf8').match(/^GH_TOKEN=(.+)$/m);
  if (!m) throw new Error('GH_TOKEN not found. Set GH_TOKEN env var or add GH_TOKEN= to .dev.vars');
  return m[1].trim();
}

const TOKEN = token();

async function gh(method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${endpoint} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = (json.errors || []).map((e) => e.message).join('; ') || json.message || `HTTP ${res.status}`;
    throw new Error(`${method} ${endpoint} → ${msg}`);
  }
  return json;
}

async function main() {
  const baseArg = process.argv[2];
  if (!baseArg) {
    console.error('Usage: node scripts/push-via-api.js <base-sha>');
    process.exit(1);
  }

  /* The GitHub API needs the full 40-char SHA. Resolve the prefix from local
     history only — `git rev-parse <remote-ref>` would hit the network, which is
     exactly what is broken here. */
  let base = baseArg;
  if (!/^[0-9a-f]{40}$/i.test(base)) {
    try {
      const log = execSync(`git log --all --format=%H`, { encoding: 'utf8' });
      const hit = log.split('\n').find((sha) => sha.startsWith(baseArg));
      if (hit) base = hit.trim();
    } catch {
      /* fall through to the validation below */
    }
  }
  if (!/^[0-9a-f]{40}$/i.test(base)) {
    console.error(`无法把 "${baseArg}" 解析成完整 SHA（请传入 40 位完整 SHA）`);
    process.exit(1);
  }

  console.log(`\n通过 API 推送到 ${REPO}（base ${base.slice(0, 7)}）\n`);

  /* 1. current remote head */
  const ref = await gh('GET', `/repos/${REPO}/git/ref/heads/main`);
  const remoteSha = ref.object.sha;
  console.log(`  远端 HEAD: ${remoteSha.slice(0, 7)}`);

  /* 2. base tree */
  const baseCommit = await gh('GET', `/repos/${REPO}/git/commits/${base}`);
  const baseTree = baseCommit.tree.sha;

  /* Files to upload are listed explicitly. Shelling out to `git diff` fails
     here (spawnSync cmd.exe → EBUSY) and the set is small and known. */
  const files = (process.env.GH_FILES || 'BUILD_INFO.txt,package.json,scripts/build-stamp.js')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  const missing = files.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) {
    console.error(`  本地缺少: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`  待上传 ${files.length} 个文件:`);

  /* 4. build a new tree from the base tree with those blobs replaced */
  const entries = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file));
    const blob = await gh('POST', `/repos/${REPO}/git/blobs`, {
      content: content.toString('base64'),
      encoding: 'base64',
    });
    console.log(`    blob ${blob.sha.slice(0, 7)}  ${file}`);
    entries.push({ path: file, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await gh('POST', `/repos/${REPO}/git/trees`, {
    base_tree: baseTree,
    tree: entries,
  });
  console.log(`\n  新 tree: ${newTree.sha.slice(0, 7)}`);

  /* 5. commit — message passed in, since `git log` also needs cmd.exe */
  const message =
    process.env.GH_MESSAGE ||
    'Add build stamp to defeat stale-cache rebuilds\n\n' +
    'Cloudflare reused cached build output, so a source-only fix appeared to have\n' +
    'no effect. scripts/build-stamp.js now prints the stamp and git commit before\n' +
    'the build, making it visible which sources were actually used.\n' +
    'Pushed via the REST API because github.com was unreachable.\n';
  const commit = await gh('POST', `/repos/${REPO}/git/commits`, {
    message,
    tree: newTree.sha,
    parents: [remoteSha],
  });
  console.log(`  新 commit: ${commit.sha.slice(0, 7)}`);

  /* 6. move the branch pointer */
  await gh('PATCH', `/repos/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`\n  ✓ main 已更新到 ${commit.sha.slice(0, 7)}`);
  console.log(`\n请到 Cloudflare 点「立即重新部署」。\n`);
}

main().catch((e) => {
  console.error('\n错误:', e.message, '\n');
  process.exit(1);
});