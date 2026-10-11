/**
 * Push to GitHub through the REST API.
 *
 * Why not `git push`: on this network github.com — where the git transport
 * lives — is frequently unreachable (TLS handshake failures, empty
 * replies), while api.github.com responds normally. The Git Data API
 * needs only the latter.
 *
 * Everything is done with the built-in fetch. child_process is avoided
 * entirely: spawning a subprocess here fails with EBUSY, so the file list
 * has to be passed in rather than discovered here.
 *
 * Usage:
 *   git diff --name-only <base> HEAD | grep -v ... > scripts/.fl.tmp
 *   node scripts/push-via-tree.js scripts/.fl.tmp ["message"]
 *
 * With no message the commit uses the staged git message.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO = process.env.GH_REPO || 'amoywind/badoudao-cms';
const API = 'https://api.github.com/repos/' + REPO;

function token() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  const m = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').match(/^GH_TOKEN=(.+)$/m);
  if (!m) throw new Error('GH_TOKEN not found. Set it in .dev.vars');
  return m[1].trim();
}

const TOKEN = token();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

async function gh(method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

async function main() {
  const listFile = process.argv[2];
  if (!listFile) {
    console.error('Usage: node scripts/push-via-tree.js <file-list> [message]');
    process.exit(1);
  }

  const files = fs
    .readFileSync(path.resolve(ROOT, listFile), 'utf8')
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => fs.existsSync(path.resolve(ROOT, f)));

  const message =
    process.argv[3] ||
    'Update project files';

  /* Always start from the remote HEAD, never from a local sha: commits made
     through this script exist only on GitHub, so `git log` cannot find
     them and using one as the base produces a Not Found. */
  const ref = await gh('GET', '/git/ref/heads/main');
  if (!ref.object) {
    console.error('无法读取远端 HEAD:', JSON.stringify(ref.errors || ref).slice(0, 200));
    process.exit(1);
  }
  const baseSha = ref.object.sha;
  const commit = await gh('GET', `/git/commits/${baseSha}`);
  const baseTree = commit.tree.sha;

  console.log(`远端 HEAD: ${baseSha.slice(0, 7)}   待推送: ${files.length} 个文件`);

  const tree = [];
  for (const f of files) {
    const content = fs.readFileSync(path.resolve(ROOT, f)).toString('base64');
    const blob = await gh('POST', '/git/blobs', { content, encoding: 'base64' });
    if (!blob.sha) {
      console.error('  blob 失败:', f, JSON.stringify(blob).slice(0, 120));
      process.exit(1);
    }
    tree.push({ path: f, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await gh('POST', '/git/trees', { base_tree: baseTree, tree });
  if (!newTree.sha) {
    console.error('tree 失败:', JSON.stringify(newTree.errors || newTree).slice(0, 200));
    process.exit(1);
  }

  const newCommit = await gh('POST', '/git/commits', {
    message,
    tree: newTree.sha,
    parents: [baseSha]
  });
  if (!newCommit.sha) {
    console.error('commit 失败:', JSON.stringify(newCommit.errors || newCommit).slice(0, 200));
    process.exit(1);
  }

  /* force:false so a push made by another hand in the meantime is rejected
     rather than silently overwritten. */
  const upd = await gh('PATCH', '/git/refs/heads/main', { sha: newCommit.sha, force: false });
  if (!upd.object) {
    console.error('更新分支失败:', JSON.stringify(upd.errors || upd).slice(0, 200));
    process.exit(1);
  }

  console.log(`✓ main → ${newCommit.sha.slice(0, 7)}  (${files.length} 个文件)`);
}

main().catch((e) => {
  console.error('推送失败:', e.message);
  process.exit(1);
});
