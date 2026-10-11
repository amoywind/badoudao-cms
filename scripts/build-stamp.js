/**
 * Print a build stamp before the real build runs.
 *
 * Why: Cloudflare caches both the dependency tree and the build output between
 * deploys. A source-only fix does not change the cache key, so the log gives no
 * way to tell whether the clone is fresh or the cached copy was reused. This
 * line makes that visible — if the stamp does not match BUILD_INFO.txt on the
 * branch you pushed, the build is using stale sources.
 *
 * Also invalidates nothing by itself; bumping BUILD_INFO.txt is what changes
 * the cache key.
 */
const fs = require('fs');
const path = require('path');

const stampFile = path.join(__dirname, '..', 'BUILD_INFO.txt');

let stamp = '(missing BUILD_INFO.txt)';
try {
  const raw = fs.readFileSync(stampFile, 'utf8');
  const m = raw.match(/BUILD_STAMP=(.+)/);
  if (m) stamp = m[1].trim();
} catch {
  /* keep the default marker */
}

let head = '(unknown)';
try {
  head = require('child_process')
    .execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .trim();
} catch {
  /* git may be unavailable in the build image */
}

console.log(`\n─────────────────────────────────────────`);
console.log(`  BUILD STAMP : ${stamp}`);
console.log(`  GIT COMMIT  : ${head}`);
console.log(`─────────────────────────────────────────\n`);