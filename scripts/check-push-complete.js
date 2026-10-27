/**
 * Check that the push list actually covers the change.
 *
 * The failure this catches: the push list is built with
 *
 *     git diff --name-only <base> HEAD
 *
 * and <base> is a commit chosen by hand. Git compares the two
 * *snapshots*, not the two *histories* — so a file that was already
 * changed between those two points comes out as "unchanged" and drops
 * out of the list. It then never reaches the remote, the remote keeps
 * the old version of that file, and the build fails on an import that
 * no longer exists. The failure looks like a compile error in code
 * nobody touched.
 *
 * The check compares the local working tree against the remote's
 * actual tree, file by file, on the blob sha. A file that differs is
 * one the remote does not have.
 *
 * Usage:
 *   node scripts/check-push-complete.js            # against remote main
 *   node scripts/check-push-complete.js <ref>      # against another ref
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function ghToken() {
  const v = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
  const m = v.match(/^GH_TOKEN=(.+)$/m);
  return m ? m[1].trim() : '';
}

async function gh(pathname) {
  const res = await fetch(`https://api.github.com/repos/amoywind/badoudao-cms${pathname}`, {
    headers: {
      Authorization: `Bearer ${ghToken()}`,
      Accept: 'application/vnd.github+json'
    }
  });
  return res.json();
}

/** Every file git tracks, excluding the build output and the tooling.
 *
 * The list comes from git itself rather than from a file on disk. The
 * file it used to read was written by hand before each check, and it
 * was easy to forget — the check then failed with a missing file and
 * nothing was compared.
 *
 * Only the files the build reads are checked. The scripts in scripts/
 * are the owner's own tools — they measure the site, they check it,
 * they take its pictures — and the push script sends only the files a
 * change touched, so most of them have never been on the remote and
 * never needed to be. They are not part of the build. Listing them as
 * missing produced twenty-six lines of noise on every run, and a list
 * that long is a list nobody reads. */
function trackedFiles() {
  const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((f) => !f.startsWith('scripts/'))
    .filter((f) => f !== '.dev.vars.example' && f !== '.dev.vars');
}

async function main() {
  const ref = process.argv[2] || 'main';
  const list = trackedFiles();
  if (!list.length) {
    console.error('The file list is empty. Nothing to check.');
    process.exit(1);
  }

  const head = await gh(`/git/ref/heads/${ref}`);
  const sha = head?.object?.sha;
  if (!sha) {
    console.error('Could not read the remote ref:', JSON.stringify(head).slice(0, 200));
    process.exit(1);
  }
  console.log('Remote ' + ref + ' is at ' + sha.slice(0, 8));

  const missing = [];

  for (const f of list) {
    const abs = path.resolve(ROOT, f);
    if (!fs.existsSync(abs)) continue;

    const remote = await gh(`/contents/${f}?ref=${sha}`);
    if (!remote || !remote.content) {
      missing.push({ file: f, why: 'absent on the remote' });
      continue;
    }

    /* Compare the content, not the bytes and not the blob shas.

       The working tree on Windows holds CRLF and the remote holds LF,
       so the same source arrives with a different byte count and a
       different blob sha. Neither difference is a change to the code,
       and neither one breaks the build. The comparison normalises the
       line endings, so what is left is a real difference. */
    const localText = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
    const remoteText = Buffer.from(remote.content.replace(/\n/g, ''), 'base64')
      .toString('utf8')
      .replace(/\r\n/g, '\n');

    if (localText !== remoteText) {
      const localLines = localText.split('\n');
      const remoteLines = remoteText.split('\n');
      const firstDiff = localLines.findIndex((l, i) => l !== remoteLines[i]);
      missing.push({
        file: f,
        why: 'the remote has a different version (first difference on line ' +
             (firstDiff + 1) + ': here "' + (localLines[firstDiff] || '').trim() +
             '", there "' + (remoteLines[firstDiff] || '').trim() + '")'
      });
    }
  }

  if (missing.length) {
    console.log('\nThese files differ between the working tree and the remote:');
    for (const m of missing) {
      console.log('  ✗ ' + m.file + '  — ' + m.why);
    }
    console.log('\nPush them before deploying. A file left behind fails the build,');
    console.log('and the error points at code that was not part of the change.');
    process.exit(1);
  }

  console.log('\n✓ Every tracked file on the remote matches the working tree.');
}

main();
