#!/usr/bin/env node
/**
 * Fail if a source file has Windows line endings.
 *
 * Editing a file through a tool on Windows can rewrite every line ending
 * without changing a character of content. Git then reports the whole file
 * as deleted and re-added, which makes the diff unreviewable: the commit
 * that changed two table headers showed as 463 insertions and 407
 * deletions, and the real change was invisible in it.
 *
 * Runs over the tracked text sources rather than node_modules, and reports
 * how many lines are affected per file so the cause is obvious.
 *
 * Pass file paths to check only those:
 *
 *   node scripts/check-line-endings.js src/app/admin/page.tsx
 *
 * With no arguments it reports every tracked source file, which on this
 * repository means 17 files carrying CRLF from before .gitattributes
 * existed. Those are left alone: rewriting seventeen files to normalise
 * line endings would bury the real history in a diff nobody could read,
 * and git blame would stop meaning anything. Check the files you touched.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.sql', '.py']);

let files = [];
try {
  const out = execFileSync(
    'git',
    ['ls-files', 'src', 'scripts'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
  );
  files = out.split('\n').filter(Boolean);
} catch {
  console.log('读不到 git 文件列表，退回扫描 src/ 与 scripts/');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (EXT.has(path.extname(e.name))) files.push(path.relative(ROOT, full));
    }
  };
  walk(path.join(ROOT, 'src'));
  walk(path.join(ROOT, 'scripts'));
}

/* With explicit paths, only those are checked. */
const ONLY = process.argv.slice(2);
if (ONLY.length) files = ONLY;

const offenders = [];

for (const rel of files) {
  if (!EXT.has(path.extname(rel))) continue;
  const full = path.join(ROOT, rel);
  let buf;
  try { buf = fs.readFileSync(full); } catch { continue; }

  let crlf = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 10 && i > 0 && buf[i - 1] === 13) crlf++;
  }
  if (crlf > 0) offenders.push({ rel, crlf });
}

if (!offenders.length) {
  console.log(`OK  ${files.length} 个文件，换行符一致（LF）。`);
  process.exit(0);
}

console.log(`NG  ${offenders.length} 个文件含 CRLF 换行：\n`);
for (const o of offenders) {
  console.log(`  ${String(o.crlf).padStart(5)} 行  ${o.rel}`);
}
console.log('\n修复：把 CRLF 转回 LF。整文件改写会让 diff 不可读——');
console.log('一个只改了两行表头的提交会显示成几百行增删。');
process.exit(1);