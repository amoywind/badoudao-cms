/**
 * Merges the rules that are written more than once.
 *
 * A stylesheet with the same rule in it twice has a problem that is
 * not obvious: which copy wins is decided by which one was written
 * last, and that is an accident of the order the file happens to be
 * in. It bit this site once — the material grid was defined at four
 * points, two of them copies of the other two, and because the copies
 * sat further down the file they decided the result at every width. A
 * phone got four columns where the rule above it said two.
 *
 * So the copies are merged: one copy of each rule is kept and the
 * others are taken out.
 *
 * Two rules that share a selector but say different things are left
 * alone, because they are not copies of each other. The commonest case
 * is a name that used to mean one thing and now means another: the
 * picture card on a product page used to be a ".pd-video" and the
 * section that holds the videos still is, so the two halves of the
 * old card style and the new section style share a name and do not
 * share a meaning. Those are reported and left for a person to look
 * at.
 *
 * The safety check before a copy is taken out: if the same selector
 * appears between the first copy and the last one in a different media
 * query, the copies are not redundant. A rule inside a media query and
 * the same rule outside it are two rules, and which of them applies
 * depends on the width of the window.
 *
 * Run: node scripts/merge-duplicate-css.js --dry    to see the plan
 *      node scripts/merge-duplicate-css.js           to write it
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'src', 'app');

const DRY = process.argv.includes('--dry');

/* ------------------------------------------------------------------ */

/* The media queries a rule sits in, outermost first, and the selector
   it carries. */
function contextOf(rule) {
  const at = [];
  let p = rule.parent;
  while (p && p.type !== 'root') {
    if (p.type === 'atrule') at.unshift('@' + p.name + ' ' + p.params);
    p = p.parent;
  }
  return { at: at.join(' AND '), selector: rule.selector.replace(/\s*,\s*/g, ', ') };
}

/* What a rule declares, in a form that can be compared. */
function declsOf(rule) {
  return rule.nodes.map((d) => {
    if (d.type === 'decl') return d.prop + ':' + d.value + (d.important ? ' !important' : '');
    if (d.type === 'rule') {
      return '@' + d.selector + '{' + d.nodes.map((x) => x.prop + ':' + x.value).join(';') + '}';
    }
    if (d.type === 'comment') return '/*' + d.text.trim() + '*/';
    return d.type;
  }).join(';');
}

/* ------------------------------------------------------------------ */

const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));

let totalRemoved = 0;
const plan = [];
const skipped = [];

for (const name of cssFiles) {
  const file = path.join(CSS_DIR, name);
  const raw = fs.readFileSync(file, 'utf8');
  const root = postcss.parse(raw, { from: file });

  /* Every rule in the file, in order, with its context. */
  const all = [];
  root.walkRules((rule) => {
    const ctx = contextOf(rule);
    all.push({ rule, ctx, decls: declsOf(rule), at: ctx.at, selector: ctx.selector });
  });

  /* Group by context and selector. */
  const groups = new Map();
  for (const entry of all) {
    const key = entry.at + ' || ' + entry.selector;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const removed = [];

  for (const [key, list] of groups) {
    if (list.length < 2) continue;

    /* Are the copies the same rule? */
    const sigs = new Set(list.map((e) => e.decls));
    if (sigs.size > 1) continue;   /* same name, different meaning */

    /* The safety check. Is the same selector in a different media
       query between the first copy and the last one? */
    const first = list[0];
    const last = list[list.length - 1];
    const between = all.filter((e) =>
      e !== first && e !== last &&
      e.selector === first.selector &&
      e.at !== first.at &&
      e.rule.source.start.line > first.rule.source.start.line &&
      e.rule.source.start.line < last.rule.source.start.line
    );
    if (between.length > 0) {
      skipped.push({
        file: name,
        selector: first.selector,
        at: first.at,
        why: 'the same selector in a different media query sits between the copies'
      });
      continue;
    }

    /* Keep the first copy. The others go. */
    for (const entry of list.slice(1)) {
      removed.push(entry);
    }
  }

  if (removed.length === 0) continue;

  for (const e of removed) e.rule.remove();

  const out = root.toString();
  try {
    postcss.parse(out, { from: file });
  } catch (err) {
    console.error('  x ' + name + ': would not parse — not writing: ' + err.message);
    process.exit(1);
  }

  plan.push({ name, out, removed });
  totalRemoved += removed.length;
}

/* ------------------------------------------------------------------ */

console.log('Duplicate rules');
console.log('='.repeat(68));

for (const p of plan) {
  console.log('\n' + p.name + ':  ' + p.removed.length + ' copies taken out');
  const seen = new Set();
  for (const e of p.removed) {
    const key = e.selector + '|' + e.at;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log('   ' + e.selector.slice(0, 62) + '   [' + e.at + ']');
  }
}

if (skipped.length) {
  console.log('\n' + '='.repeat(68));
  console.log('Left alone');
  console.log('='.repeat(68));
  for (const s of skipped) {
    console.log('  [' + s.file + '] ' + s.selector.slice(0, 50) + '  — ' + s.why);
  }
}

console.log('\n' + '='.repeat(68));
console.log('  copies taken out  ' + totalRemoved);
console.log('  left alone        ' + skipped.length);
console.log('');

if (DRY) {
  console.log('Dry run. Nothing was written.');
  process.exit(0);
}

for (const p of plan) {
  fs.writeFileSync(path.join(CSS_DIR, p.name), p.out, 'utf8');
  console.log('  wrote ' + p.name);
}
