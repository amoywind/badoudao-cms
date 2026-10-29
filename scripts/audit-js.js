/**
 * What in the source is never used?
 *
 * Three questions:
 *
 *   1. Is an exported name imported anywhere? An export nobody imports
 *      is dead weight — it is compiled, it is in the bundle, and nobody
 *      is asking for it.
 *
 *   2. Is an import unused in the file that imports it? TypeScript
 *      will not complain about this, and a named import left behind
 *      after a refactor is a sign that the refactor did not finish.
 *
 *   3. Are two modules exporting the same name? That is not an error,
 *      but it is how a name ends up meaning two different things
 *      depending on which file imported it.
 *
 * The search is over the whole source tree, so a name used once in one
 * corner counts as used. The point is not to catch a name used in the
 * wrong place — that is what a linter is for — but to find the ones
 * nobody reached for at all.
 *
 * Run: node scripts/audit-js.js
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const sources = new Map();
for (const f of files) {
  sources.set(f, fs.readFileSync(f, 'utf8'));
}

/* ------------------------------------------------------------------ */

/* Every exported name, and where it came from. */
const exportsByName = new Map();  /* name -> [{file, kind}] */

const EXPORT_RE = [
  /* export const/let/function/class/async function */
  { re: /^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm, kind: 'value' },
  /* export { a, b as c } */
  { re: /^export\s*\{([^}]*)\}/gm, kind: 'value', named: true },
  /* export type { … } / export interface / export type */
  { re: /^export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/gm, kind: 'type' },
  /* export type { … } */
  { re: /^export\s+type\s*\{([^}]*)\}/gm, kind: 'type', named: true },
  /* export default */
  { re: /^export\s+default\s+([A-Za-z_$][\w$]*)/gm, kind: 'default' }
];

for (const [file, src] of sources) {
  for (const { re, kind, named } of EXPORT_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      if (named) {
        /* "a, b as c" — the exported name is after "as", or the name
           itself when there is no "as". */
        for (const part of m[1].split(',')) {
          const t = part.trim().replace(/^type\s+/, '');
          if (!t) continue;
          const name = t.includes(' as ') ? t.split(/\s+as\s+/)[1].trim() : t;
          if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
          if (!exportsByName.has(name)) exportsByName.set(name, []);
          exportsByName.get(name).push({ file, kind });
        }
      } else {
        const name = m[1];
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        if (!exportsByName.has(name)) exportsByName.set(name, []);
        exportsByName.get(name).push({ file, kind });
      }
    }
  }
}

/* ------------------------------------------------------------------ */

/* Every name that is imported somewhere. */
const imported = new Map();  /* name -> [{file, line}] */

const IMPORT_RE = [
  /* import { a, b as c } from '…' */
  { re: /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g, named: true },
  /* import X from '…' */
  { re: /import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s+from\s*['"][^'"]+['"]/g, named: false },
  /* import * as X from '…' */
  { re: /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"][^'"]+['"]/g, named: false }
];

for (const [file, src] of sources) {
  for (const { re, named } of IMPORT_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      if (named) {
        for (const part of m[1].split(',')) {
          const t = part.trim().replace(/^type\s+/, '');
          if (!t) continue;
          const name = t.includes(' as ') ? t.split(/\s+as\s+/)[1].trim() : t;
          if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
          if (!imported.has(name)) imported.set(name, []);
          imported.get(name).push({ file, line });
        }
      } else {
        const name = m[1];
        if (!imported.has(name)) imported.set(name, []);
        imported.get(name).push({ file, line });
      }
    }
  }
}

/* ------------------------------------------------------------------ */

console.log('Source');
console.log('='.repeat(64));
console.log('  files                  ' + files.length);
console.log('  exported names         ' + exportsByName.size);
console.log('  imported names         ' + imported.size);
console.log('');

console.log('Exports nobody imports');
console.log('='.repeat(64));

const dead = [];
for (const [name, list] of exportsByName) {
  if (imported.has(name)) continue;
  /* A page's default export is used by Next.js by convention, and a
     route's exports are its HTTP methods. Neither is imported by
     name. */
  const allDefault = list.every((l) => l.kind === 'default');
  const inRoute = list.every((l) => /[\\/]api[\\/]/.test(l.file) || /page\.tsx$/.test(l.file) || /layout\.tsx$/.test(l.file) || /route\.ts$/.test(l.file));
  if (allDefault || inRoute) continue;
  dead.push({ name, list });
}
dead.sort((a, b) => a.name.localeCompare(b.name));

if (dead.length === 0) {
  console.log('\nNone.');
} else {
  for (const d of dead) {
    console.log('\n' + d.name + '   (' + d.list.map((l) => path.relative(SRC, l.file)).join(', ') + ')');
    console.log('   ' + d.list[0].kind);
  }
}

/* ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(64));
console.log('The same name exported from more than one file');
console.log('='.repeat(64));

const clashes = [];
for (const [name, list] of exportsByName) {
  const filesSet = new Set(list.map((l) => l.file));
  if (filesSet.size > 1) clashes.push({ name, list });
}
clashes.sort((a, b) => a.name.localeCompare(b.name));

if (clashes.length === 0) {
  console.log('\nNone.');
} else {
  for (const c of clashes) {
    console.log('\n' + c.name);
    c.list.forEach((l) => console.log('   ' + path.relative(SRC, l.file)));
  }
}

/* ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(64));
console.log('Imports that are not used in the file that imports them');
console.log('='.repeat(64));

/* For each file, find its imported names and check whether the name
   appears anywhere else in that file. */
let unusedCount = 0;
for (const [file, src] of sources) {
  const names = [];
  for (const { re, named } of IMPORT_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      if (named) {
        for (const part of m[1].split(',')) {
          const t = part.trim().replace(/^type\s+/, '');
          if (!t) continue;
          const name = t.includes(' as ') ? t.split(/\s+as\s+/)[1].trim() : t;
          if (/^[A-Za-z_$][\w$]*$/.test(name)) names.push({ name, index: m.index, len: m[0].length });
        }
      } else {
        names.push({ name: m[1], index: m.index, len: m[0].length });
      }
    }
  }

  const unused = [];
  for (const { name, index, len } of names) {
    /* The body of the file, without the import statements. */
    let body = src;
    body = body.replace(IMPORT_RE[0].re, '');
    body = body.replace(IMPORT_RE[1].re, '');
    body = body.replace(IMPORT_RE[2].re, '');
    const used = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(body);
    if (!used) {
      unused.push({ name, line: src.slice(0, index).split('\n').length });
    }
  }

  if (unused.length) {
    unusedCount += unused.length;
    console.log('\n' + path.relative(SRC, file));
    unused.forEach((u) => console.log('   line ' + u.line + '  ' + u.name));
  }
}

if (unusedCount === 0) console.log('\nNone.');

console.log('\n' + '='.repeat(64));
console.log('Summary');
console.log('='.repeat(64));
console.log('  exports never imported      ' + dead.length);
console.log('  names exported twice        ' + clashes.length);
console.log('  unused imports              ' + unusedCount);
console.log('');
