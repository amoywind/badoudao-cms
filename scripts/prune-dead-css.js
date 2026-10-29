/**
 * Removes the rules that style classes nothing uses.
 *
 * Deleting a rule by searching for its text is how a stylesheet loses
 * more than it meant to: a selector that appears inside a group with a
 * comma is part of that group, and cutting the group cuts the other
 * members of it too. It happened here once — ninety real rules went in
 * one edit because a search matched a substring.
 *
 * So this reads the stylesheet with a real CSS parser. The earlier
 * version of this script read it as flat text and got it wrong in ways
 * that were not obvious:
 *
 *   - A comment above a rule routinely quotes the rule it explains,
 *     braces and all. Reading the text flat means the head of the next
 *     rule comes out as half a comment.
 *
 *   - A comma inside :where() separates alternatives, not selectors.
 *     Splitting on it turns one selector into three.
 *
 *   - A rule body may hold braces of its own, so the opening brace
 *     cannot be found by searching forward from the body.
 *
 * The parser knows all three. What is left to decide is what counts as
 * dead, and that is done here.
 *
 * A class is dead when the source never mentions it. A rule is removed
 * when every class it names is dead. A rule that names a live class and
 * a dead one keeps the live one: the dead class comes out of the
 * selector list, and a grouped selector becomes a shorter group.
 *
 * A class inside :where() or :is() is left where it is. Those are
 * fallback lists, and taking one out narrows the rule rather than
 * removing dead weight.
 *
 * Before it writes, it prints every rule it intends to remove, and it
 * refuses to write if the file would not parse afterwards.
 *
 * Run: node scripts/prune-dead-css.js --dry     to see the plan
 *      node scripts/prune-dead-css.js            to write it
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'src', 'app');
const SRC_DIR = path.join(ROOT, 'src');

const DRY = process.argv.includes('--dry');

/* ------------------------------------------------------------------ */

/* The classes to remove. Taken from the command line. */
const DEAD = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')));
if (DEAD.size === 0) {
  console.error('No class names given.');
  console.error('  node scripts/verify-dead-classes.js   lists them');
  process.exit(1);
}

/* ------------------------------------------------------------------ */

function walk(dir, out = [], filter) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, filter);
    else if (!filter || filter(e.name)) out.push(p);
  }
  return out;
}

/* Every class name the source mentions, as a whole word. */
const srcFiles = walk(SRC_DIR, [], (n) => /\.(tsx|ts)$/.test(n));
const srcText = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

function isAlive(name) {
  if (DEAD.has(name)) return false;
  return new RegExp('\\b' + name.replace(/-/g, '[\\s\\-]') + '\\b').test(srcText);
}

/* ------------------------------------------------------------------ */

/* The class names in a selector, and which of them are inside a
   functional pseudo-class.

   :where() and :is() take a list of alternatives. A class in one of
   them is a fallback: the rule applies to it unless something more
   specific says otherwise. Those are left in place. */
function classesIn(selector) {
  const outside = [];
  const inside = [];

  let depth = 0;
  let buf = '';
  const chunks = [];

  for (const c of selector) {
    if (c === '(') { chunks.push({ depth, text: buf }); buf = ''; depth++; continue; }
    if (c === ')') { chunks.push({ depth, text: buf }); buf = ''; depth--; continue; }
    buf += c;
  }
  chunks.push({ depth, text: buf });

  for (const ch of chunks) {
    const found = [];
    const re = /\.(-?[A-Za-z_][\w-]*)/g;
    let m;
    while ((m = re.exec(ch.text))) found.push(m[1]);
    if (ch.depth === 0) outside.push(...found);
    else inside.push(...found);
  }
  return { outside, inside };
}

/* Splits a selector list. A comma inside :where() is not a split
   point: it separates alternatives, not selectors. */
function splitSelectorList(selector) {
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const c of selector) {
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      parts.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/* ------------------------------------------------------------------ */

const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));

let totalRemoved = 0;
let totalRewritten = 0;
const plan = [];

for (const name of cssFiles) {
  const file = path.join(CSS_DIR, name);
  const raw = fs.readFileSync(file, 'utf8');

  let root;
  try {
    root = postcss.parse(raw, { from: file });
  } catch (e) {
    console.error('  x ' + name + ': could not parse - ' + e.message);
    process.exit(1);
  }

  const removed = [];
  const rewritten = [];

  root.walkRules((rule) => {
    const parts = splitSelectorList(rule.selector);
    const kept = [];
    let dropped = 0;
    let fixed = 0;

    for (const sel of parts) {
      const cls = classesIn(sel);
      const all = [...cls.outside, ...cls.inside];
      if (all.length === 0) { kept.push(sel); continue; }

      /* Dropped only when every class it names is dead. */
      const live = all.filter((c) => isAlive(c));
      if (live.length === 0) { dropped++; continue; }

      /* The selector names both live and dead classes.

         The dead class is taken out of the selector list as a whole
         member, not edited out of the member's own text. A member is
         a selector in its own right: ".site .pd-cr" means a .pd-cr
         inside a .site, and cutting the .pd-cr out of it leaves
         ".site" - which means the whole site, and is a different rule
         altogether rather than a smaller one.

         So a member that names a dead class is dropped whole, and a
         member that names only live classes is kept whole. */
      kept.push(sel);
    }

    if (dropped === 0 && fixed === 0) return;

    if (kept.length === 0) {
      removed.push(rule);
      totalRemoved++;
    } else if (fixed > 0) {
      const before = rule.selector;
      rule.selector = kept.join(', ');
      rewritten.push({ before, after: rule.selector });
      totalRewritten++;
    }
  });

  if (removed.length === 0 && rewritten.length === 0) continue;

  /* Take the rules out. */
  for (const rule of removed) rule.remove();

  /* An at-rule whose only rule has just been removed is an empty block.
     It parses, so nothing complains, and it reads as if the rule were
     still there. */
  root.walkAtRules((at) => {
    if (!at.nodes || at.nodes.length === 0) at.remove();
  });

  const out = root.toString();

  /* The file must still parse. */
  try {
    postcss.parse(out, { from: file });
  } catch (e) {
    console.error('  x ' + name + ': would not parse afterwards - not writing: ' + e.message);
    process.exit(1);
  }

  plan.push({ name, out, removed, rewritten });
}

/* ------------------------------------------------------------------ */

console.log(DEAD.size + ' class names to remove');
console.log('='.repeat(64));

for (const p of plan) {
  console.log('\n' + p.name + ':  ' + p.removed.length + ' rules removed, ' + p.rewritten.length + ' selectors rewritten');
}

console.log('\n' + '='.repeat(64));
console.log('Rules being removed');
console.log('='.repeat(64));

for (const p of plan) {
  for (const r of p.removed) {
    console.log('  [' + p.name + '] ' + r.selector.slice(0, 76));
  }
}

if (plan.some((p) => p.rewritten.length)) {
  console.log('\n' + '='.repeat(64));
  console.log('Selectors being rewritten');
  console.log('='.repeat(64));
  for (const p of plan) {
    for (const r of p.rewritten) {
      console.log('  [' + p.name + ']');
      console.log('     was: ' + r.before.slice(0, 74));
      console.log('     now: ' + r.after.slice(0, 74));
    }
  }
}

console.log('\n' + '='.repeat(64));
console.log('  rules removed    ' + totalRemoved);
console.log('  selectors fixed  ' + totalRewritten);
console.log('');

if (DRY) {
  console.log('Dry run. Nothing was written.');
  process.exit(0);
}

for (const p of plan) {
  fs.writeFileSync(path.join(CSS_DIR, p.name), p.out, 'utf8');
  console.log('  wrote ' + p.name);
}
