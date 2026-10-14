/**
 * Catch a Promise.all whose destructuring reads more names than the array
 * has entries.
 *
 * The product page answered 404 on every detail page for a deployment
 * because of exactly this: getProduct destructured five names off a
 * Promise.all with four queries, so customs was undefined and the map on
 * it threw. The page called getProduct inside `.catch(() => null)`, so the
 * database error was reported as "product not found" — a 404 for a page
 * that exists, on every product, while the list page worked fine because
 * its query was not the broken one.
 *
 * TypeScript does not catch it: the array holds a union of promise types
 * and reading past the end is not a type error when the literal is inline.
 *
 *   node scripts/check-promise-all.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const EXT = new Set(['.ts', '.tsx']);
const findings = [];

/** Top-level comma-separated entries between [ and its matching ]. */
function countEntries(src, openIdx) {
  let depth = 0;
  let entries = 0;
  let saw = false;

  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];

    /* Skip strings and comments so a bracket or a comma inside them does
       not shift the depth. The first version of this counted the call's own
       parenthesis as an argument, which made every call report one entry
       too few and flagged six correct files. */
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) break;
        i++;
      }
      if (depth === 1) saw = true;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++;
      continue;
    }

    if (c === '[' || c === '(' || c === '{') {
      depth++;
      if (depth === 1) continue;
      if (depth > 1) saw = true;
      continue;
    }

    if (c === ']' || c === ')' || c === '}') {
      depth--;
      if (depth === 0) return saw ? entries + 1 : 0;
      continue;
    }

    if (depth === 1) {
      if (c === ',') entries++;
      else if (!/\s/.test(c)) saw = true;
    }
  }
  return 0;
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!EXT.has(path.extname(e.name))) continue;

    const src = fs.readFileSync(full, 'utf8');

    src.split('\n').forEach((line, idx) => {
      const m = line.match(/const\s*\[([^\]]+)\]\s*=\s*await\s*Promise\.allSettled?\s*\(/);
      if (!m) return;

      const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      if (names.length < 2) return;

      const callAt = line.indexOf('Promise.all');
      const arrAt = src.indexOf('[', callAt);
      if (arrAt < 0) return;

      const entries = countEntries(src, arrAt);

      if (entries !== names.length) {
        findings.push({
          rel: path.relative(ROOT, full).replace(/\\/g, '/'),
          line: idx + 1,
          names: names.length,
          entries,
          text: line.trim().slice(0, 90)
        });
      }
    });
  }
}

walk(ROOT);

if (!findings.length) {
  console.log('OK  所有 Promise.all 解构与数组长度一致。');
  process.exit(0);
}

console.log(`NG  ${findings.length} 处解构数量与数组条目数不符：\n`);
for (const f of findings) {
  console.log(`  ${f.rel}:${f.line}`);
  console.log(`     解构 ${f.names} 个名字，数组只有 ${f.entries} 项`);
  console.log(`     ${f.text}`);
}
console.log('\n多解构出来的名字是 undefined，对它 .map() 会抛错；');
console.log('若外层有 .catch(() => null)，这个错误会被报成 404 —— 产品存在却打不开。');
process.exit(1);