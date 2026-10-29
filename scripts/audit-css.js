/**
 * What in the stylesheets is duplicated, and what in them is dead?
 *
 * Two questions, both asked of every rule in the stylesheets rather
 * than of a sample:
 *
 *   1. Is the same selector written more than once? Two rules for one
 *      selector means the later one wins and the earlier one is dead
 *      weight, and the order is decided by where in the file the author
 *      happened to put it. That is how a grid ends up at four columns
 *      on a phone when the rule above it says two.
 *
 *   2. Is the class used anywhere in the source? A class that is styled
 *      but never written in a component is a rule nobody is asking for.
 *      The opposite is worse and is not what this looks for: a class
 *      written in a component but not styled falls back to the browser
 *      default, which is a different kind of problem.
 *
 * The stylesheets are read as flat text, not as CSS, because what
 * matters here is the order and the repetition, and a parser that
 * resolves the cascade would hide exactly the thing being looked for.
 *
 * Run: node scripts/audit-css.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'src', 'app');
const SRC_DIR = path.join(ROOT, 'src');

/* ------------------------------------------------------------------ */

/* Strips comments and collapses whitespace, so that two rules written
   the same way are seen as the same rule. */
function normalise(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Pulls out the rule blocks: a selector, a brace, a body.

   The scan keeps a stack of open braces. A selector is the text
   between one open brace and the last close brace before it, and the
   body is everything between the brace and its match. A rule nested
   inside a media query comes out with the query as part of its
   selector, and is marked with the query it sits in, because two rules
   for one selector in two different media queries are a breakpoint and
   two rules for one selector in the same query are a duplicate. */
function rules(css) {
  const out = [];
  const stack = [];   /* { head, bodyStart } */

  for (let i = 0; i < css.length; i++) {
    const c = css[i];

    if (c === '{') {
      /* Everything since the last close brace is the selector. */
      let head = '';
      for (let k = i - 1; k >= 0; k--) {
        if (css[k] === '}') break;
        head = css[k] + head;
      }
      /* A comment before the selector belongs to it for reading, but it
         has to come out before the selector is used as a key: a
         comment can hold braces and one that does would make two
         different rules look different when they are the same. */
      head = head.replace(/\/\*[\s\S]*?\*\//g, ' ');
      stack.push({ head: head.replace(/\s+/g, ' ').trim(), bodyStart: i + 1 });
      continue;
    }

    if (c === '}') {
      const frame = stack.pop();
      if (!frame) continue;
      const body = css.slice(frame.bodyStart, i);
      const head = frame.head;

      /* An at-rule that opens a block: @media, @supports, @container.
         Its contents are scanned separately, so this frame is not a
         rule in its own right. */
      if (head.startsWith('@')) continue;

      out.push({
        head,
        body,
        start: frame.bodyStart,
        /* The innermost at-rule this sits in. */
        media: (() => {
          for (const f of stack) {
            if (f.head.startsWith('@media') || f.head.startsWith('@supports') || f.head.startsWith('@container')) {
              return f.head.replace(/\s+/g, ' ').trim();
            }
          }
          return '(top level)';
        })()
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */

function collectClasses(src) {
  const classes = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(tsx|ts)$/.test(e.name)) continue;
      const s = fs.readFileSync(p, 'utf8');
      /* className="a b c" and className={`a ${x}`} */
      const re = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
      let m;
      while ((m = re.exec(s))) {
        const raw = (m[1] || m[2] || m[3] || '');
        /* Split on anything that is not a word character, then pull the
           word characters out of each piece. This catches both
           className="a b" and className={`a ${cond ? 'b' : 'c'}`}. */
        const pieces = raw.split(/[^A-Za-z0-9_-]+/);
        for (const piece of pieces) {
          const c = piece.trim();
          if (c && /^[a-zA-Z]/.test(c)) classes.add(c);
        }
      }
      /* clsx-style arrays and object keys: ['a', 'b'] */
      const arrRe = /\[(?:'|\")([a-z][a-z0-9_-]*(?:'|\",\s*(?:'|\")[a-z][a-z0-9_-]*)+)/gi;
      while ((m = arrRe.exec(s))) {
        const inner = m[1];
        const re2 = /['"]([a-z][a-z0-9_-]*)['"]/gi;
        let m2;
        while ((m2 = re2.exec(inner))) classes.add(m2[1]);
      }
    }
  };
  walk(SRC_DIR);
  return classes;
}

/* ------------------------------------------------------------------ */

const cssFiles = fs.readdirSync(CSS_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => path.join(CSS_DIR, f));

const used = collectClasses(SRC_DIR);

console.log('Stylesheets');
console.log('='.repeat(64));

const allClasses = new Map();   /* class -> [{file, head, media}] */
const seenSelectors = new Map(); /* normalised head+media -> [{file, start}] */
let ruleCount = 0;

for (const file of cssFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const css = normalise(raw);
  const name = path.basename(file);
  const list = rules(css);

  ruleCount += list.length;
  console.log('\n' + name + ' — ' + list.length + ' rules');

  for (const r of list) {
    const media = r.media;

    /* Class names used by this rule. */
    for (const m of r.head.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) {
      const c = m[1];
      if (!allClasses.has(c)) allClasses.set(c, []);
      allClasses.get(c).push({ file: name, head: r.head, media, body: r.body });
    }

    /* The same selector in the same context, written twice. */
    const key = media + ' || ' + r.head.replace(/\s*,\s*/g, ',');
    if (!seenSelectors.has(key)) seenSelectors.set(key, []);
    seenSelectors.get(key).push({ file: name, start: r.start, media, head: r.head });
  }
}

/* ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(64));
console.log('Selectors written more than once in the same context');
console.log('='.repeat(64));

let dupCount = 0;
const dupes = [...seenSelectors.entries()]
  .filter(([, v]) => v.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

for (const [key, list] of dupes) {
  dupCount++;
  const media = list[0].media;
  console.log('\n' + (list.length) + '×  ' + list[0].head + '   [' + media + ']');
  list.forEach((l) => {
    console.log('     ' + l.file + '  @' + l.start);
  });
}

if (dupCount === 0) console.log('\nNone.');

/* ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(64));
console.log('Classes styled but never written in a component');
console.log('='.repeat(64));

let deadCount = 0;
const dead = [];
for (const [cls, list] of allClasses) {
  if (used.has(cls)) continue;
  /* A class that is only ever a state modifier of another class is
     still used if the base is used. But a state modifier written on its
     own is dead. The conservative test: is the class name mentioned
     anywhere in the source at all, in any form? */
  dead.push({ cls, list });
}
dead.sort((a, b) => b.list.length - a.list.length);

for (const d of dead) {
  deadCount++;
  console.log('\n.' + d.cls + '  (' + d.list.length + ' rule' + (d.list.length > 1 ? 's' : '') + ')');
  d.list.slice(0, 6).forEach((l) => {
    console.log('     ' + l.file + '  [' + l.media + ']  ' + l.head.slice(0, 70));
  });
  if (d.list.length > 6) console.log('     … and ' + (d.list.length - 6) + ' more');
}

if (deadCount === 0) console.log('\nNone.');

/* ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(64));
console.log('Summary');
console.log('='.repeat(64));
console.log('  rules read              ' + ruleCount);
console.log('  distinct classes styled ' + allClasses.size);
console.log('  classes used in source  ' + used.size);
console.log('  duplicated selectors    ' + dupCount);
console.log('  classes styled, unused  ' + deadCount);
console.log('');
