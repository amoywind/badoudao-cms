/**
 * Scan every client component for the two shapes of bug that produce
 * "Application error: a client-side exception has occurred".
 *
 * 1. Reading the clock or a random number during render. The server and the
 *    browser evaluate these at different moments, so the two trees differ
 *    and React throws rather than patch them.
 * 2. `n && <jsx>` where n is a number. When n is 0 React renders a literal
 *    "0" into the DOM, which is a different tree from rendering nothing.
 *
 * Neither is caught by the type checker or by reading the code; both only
 * show up in a browser. Run before deploying anything that touches a
 * client component.
 *
 * Usage: node scripts/scan-hydration.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const FINDINGS = [];

/**
 * Checked by hand and confirmed safe. Each entry says why, so a future
 * change to one of these lines has to come back and justify itself.
 *
 *   string  — falsy is '', which renders nothing; the hazard is only ever
 *             a numeric 0
 *   bool    — produced by a comparison, so it is true or false
 *   handler — runs on an event, long after the render that would mismatch
 */
const KNOWN_SAFE = [
  { match: /\{i\.company &&/, why: 'string' },
  { match: /\{href &&/, why: 'string' },
  { match: /\{cutTitle &&/, why: 'boolean' },
  { match: /\{cutDesc &&/, why: 'boolean' },
  { match: /setToast\(\{ msg, kind, id: Date\.now\(\) \}\)/, why: 'handler' },
  { match: /\{fileError &&/, why: 'string' },
  { match: /\{preset &&/, why: 'string' },
  { match: /\{late &&/, why: 'boolean' },
  { match: /\{s\.stale > 0 &&/, why: 'explicit numeric comparison' },
  { match: /\{m\.usedBy\.length > 0 &&/, why: 'explicit numeric comparison' },
  { match: /\{p\.featured === 1 &&/, why: 'explicit numeric comparison' },
  { match: /\{!product\.specs\.length &&/, why: 'boolean from !' }
];

function isKnownSafe(line) {
  return KNOWN_SAFE.find((k) => k.match.test(line));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.tsx$/.test(entry.name)) continue;

    const src = fs.readFileSync(full, 'utf8');
    /* Only client components can hydrate, and only they can crash. */
    if (!/^\s*'use client'/.test(src)) continue;

    const rel = path.relative(path.join(__dirname, '..'), full);
    const lines = src.split('\n');

    /* Effect bodies and event handlers run after render, so a clock read
       there is correct and must not be flagged. */
    const renderLines = new Set();
    let inEffect = false, depth = 0;
    for (const line of lines) {
      if (/useEffect\s*\(|useLayoutEffect\s*\(/.test(line)) inEffect = true;
      if (inEffect) {
        depth += (line.match(/{/g) || []).length;
        depth -= (line.match(/}/g) || []).length;
        if (depth <= 0) inEffect = false;
        renderLines.add(line);
      }
    }

    lines.forEach((line, i) => {
      const no = i + 1;
      if (renderLines.has(line)) return;

      /* onClick / onChange / onSubmit and friends are handlers, not render. */
      if (/\bon[A-Z]\w*\s*=|=>\s*$|useEffect|useState|useCallback/.test(line)) return;

      /* A plain function declaration is a handler called later, not the
         render pass — `show()` filling a toast is the common case. */
      if (/^\s*(async\s+)?function\s+\w+/.test(line)) return;

      /* A clock read guarded by a mounted flag is the intended fix, not a
         hazard: the ternary renders a constant on the server. */
      const guardedByMount = /useMounted|mounted\s*\?/.test(line);
      const inGuardedBlock =
        guardedByMount ||
        (i > 0 && /const \w+ = mounted\s*$/.test(lines[i - 1].trim()));

      const safe = isKnownSafe(line);
      if (!inGuardedBlock && !safe && /Date\.now\(\)|Math\.random\(\)/.test(line)) {
        FINDINGS.push({ rel, no, kind: 'clock-in-render', line: line.trim() });
      }

      /* {count && <X/>} — a bare 0 renders as the character "0". Only a
         value that can actually be the number 0 matters; a string or a
         boolean is fine, and the flags are below. */
      const m = line.match(/\{\s*([\w.?\[\]']+)\s*&&\s*</);
      if (m && !/\.length\s*>\s*0/.test(line) && !/mounted/.test(line)) {
        const name = m[1];
        /* Find the declaration to learn the type. Strings and booleans are
           safe even when falsy; numbers are not. */
        const decl = lines.find(l =>
          new RegExp(`\\b${name.replace(/[.']/g, '\\$&')}\\b`).test(l) &&
          /(const|let|var)\s/.test(l)
        );
        const isStringOrBool =
          decl && /(\.test\(|\.map\(|\.includes\(|\.trim\(|===|\?\s|:\s)/.test(decl);
        if (!isStringOrBool && !safe) {
          FINDINGS.push({ rel, no, kind: 'possibly-numeric-guard', line: line.trim() });
        }
      }
    });
  }
}

walk(SRC);

if (!FINDINGS.length) {
  console.log('No hydration hazards found.');
  process.exit(0);
}

console.log(`${FINDINGS.length} finding(s):\n`);
for (const f of FINDINGS) {
  console.log(`  ${f.rel}:${f.no}  [${f.kind}]`);
  console.log(`    ${f.line.slice(0, 100)}`);
}
process.exit(1);