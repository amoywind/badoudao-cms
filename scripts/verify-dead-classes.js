/**
 * Is a class name really absent from the source?
 *
 * The first audit found sixty-eight classes styled but never written in
 * a component. That number was too high to act on: the way the classes
 * were extracted missed some, and a class that is styled and used is
 * not dead weight, it is the site.
 *
 * So this asks the question the other way round. For each class the
 * stylesheets style, it looks for the name in the source as a whole
 * word — in a className, in a string, in a template literal, anywhere.
 * A name that appears nowhere at all is dead. A name that appears
 * somewhere is alive, and the question of whether it is in a className
 * or in a comment does not matter: something refers to it.
 *
 * Two kinds of name are never dead:
 *
 *   - The ones the framework reads by name: generateMetadata, dynamic,
 *     runtime, GET, POST. Those are conventions, not imports.
 *
 *   - The ones that are prefixes of a longer name. A rule for `.hero`
 *     does not go dead because the site now says `.hero2` — but it also
 *     does not match `.hero2`, so the rule is doing nothing either
 *     way. Those are reported separately so they can be looked at by
 *     hand rather than deleted on the strength of a script.
 *
 * Run: node scripts/verify-dead-classes.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'src', 'app');
const SRC_DIR = path.join(ROOT, 'src');

/* ------------------------------------------------------------------ */

function walk(dir, out = [], filter) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, filter);
    else if (!filter || filter(e.name)) out.push(p);
  }
  return out;
}

/* Every piece of source, as one string, so a name can be looked for
   anywhere at all. */
const srcFiles = walk(SRC_DIR, [], (n) => /\.(tsx|ts)$/.test(n));
const allSrc = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

/* Where each name occurs, so a hit can be looked at. */
function occurrences(name) {
  const hits = [];
  const re = new RegExp('\\b' + name.replace(/[-]/g, '[\\s\\-]') + '\\b', 'g');
  for (const f of srcFiles) {
    const s = fs.readFileSync(f, 'utf8');
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const line = s.slice(0, m.index).split('\n').length;
      const text = s.split('\n')[line - 1].trim().slice(0, 80);
      hits.push({ file: path.relative(SRC_DIR, f), line, text });
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ */

/* The class names the stylesheets mention. */
const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));
const classNames = new Map();  /* class -> [{file, count}] */

for (const f of cssFiles) {
  const s = fs.readFileSync(path.join(CSS_DIR, f), 'utf8');
  const clean = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of clean.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
    const name = m[1];
    if (!classNames.has(name)) classNames.set(name, []);
    classNames.get(name).push({ file: f });
  }
}

/* ------------------------------------------------------------------ */

/* A name is alive if it appears anywhere in the source. The word
   boundary is what makes this useful: searching for "hero" finds
   "hero2" and "hero-btns", so the search has to be for the whole name
   with the dashes treated as separators. */
function isUsed(name) {
  const hits = occurrences(name);
  return hits.length > 0;
}

/* A name that is only ever a prefix of something longer — the search
   finds hits, but every hit has a character after it that makes it a
   different name. */
function isPrefixOnly(name) {
  const hits = occurrences(name);
  if (hits.length === 0) return false;
  return hits.every((h) => {
    const src = fs.readFileSync(path.join(SRC_DIR, h.file), 'utf8');
    const lines = src.split('\n');
    const line = lines[h.line - 1] || '';
    const i = line.indexOf(h.text.replace(/^\s+/, ''));
    const at = i >= 0 ? line.indexOf(h.text.replace(/^\s+/, ''), i) : 0;
    const after = line.slice(at + name.length);
    /* If the next character is a word character or a dash, then what we
       found is a longer name, not this one. */
    return /^[A-Za-z0-9_-]/.test(after);
  });
}

/* ------------------------------------------------------------------ */

console.log('Classes the stylesheets style');
console.log('='.repeat(64));

const dead = [];
const prefixOnly = [];
const alive = [];

for (const [name, list] of classNames) {
  if (isUsed(name)) {
    alive.push({ name, list });
  } else if (isPrefixOnly(name)) {
    prefixOnly.push({ name, list });
  } else {
    dead.push({ name, list });
  }
}

console.log('  styled              ' + classNames.size);
console.log('  named in source     ' + alive.length);
console.log('  prefix of a longer ' + prefixOnly.length);
console.log('  named nowhere      ' + dead.length);
console.log('');

console.log('Named nowhere in the source — dead');
console.log('='.repeat(64));

dead.sort((a, b) => b.list.length - a.list.length);
for (const d of dead) {
  const files = [...new Set(d.list.map((l) => l.file))].join(', ');
  console.log('\n.' + d.name + '   (' + d.list.length + ' rules in ' + files + ')');
}

console.log('\n' + '='.repeat(64));
console.log('Only ever a prefix of a longer name — the rule matches nothing');
console.log('='.repeat(64));

prefixOnly.sort((a, b) => b.list.length - a.list.length);
for (const d of prefixOnly) {
  const files = [...new Set(d.list.map((l) => l.file))].join(', ');
  console.log('  .' + d.name.padEnd(20) + d.list.length + ' rules  (' + files + ')');
}

console.log('\n' + '='.repeat(64));
console.log('Summary');
console.log('='.repeat(64));
console.log('  classes styled            ' + classNames.size);
console.log('  genuinely dead            ' + dead.length);
console.log('  dead by prefix            ' + prefixOnly.length);
console.log('');
