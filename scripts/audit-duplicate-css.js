/**
 * The selectors that are written more than once, and whether the two
 * copies say the same thing.
 *
 * A selector written twice is not always a mistake. Two cases look the
 * same from the outside and are not:
 *
 *   - The same rule twice. The second copy is the first copy again,
 *     and one of them can go.
 *
 *   - Two different rules that happen to share a name. One of them is
 *     for an element the page has and the other is for one it has not
 *     had for a while — a card style left over from a version of the
 *     page that used to show photographs in a grid. Merging those two
 *     would apply the wrong one to the wrong thing, and the mistake
 *     would not show up until somebody looked at a page that happened
 *     to have the element.
 *
 * So this reads every rule with a CSS parser, groups the rules by
 * selector and by the media query they sit in, and reports which of
 * the two kinds each one is.
 *
 * Run: node scripts/audit-duplicate-css.js
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'src', 'app');

/* ------------------------------------------------------------------ */

const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));

/* selector + media → [{file, line, body, decls}] */
const groups = new Map();

for (const name of cssFiles) {
  const file = path.join(CSS_DIR, name);
  const raw = fs.readFileSync(file, 'utf8');
  const root = postcss.parse(raw, { from: file });

  root.walkRules((rule) => {
    /* The media queries this rule sits in, outermost first. */
    const at = [];
    let p = rule.parent;
    while (p && p.type !== 'root') {
      if (p.type === 'atrule') at.unshift('@' + p.name + ' ' + p.params);
      p = p.parent;
    }
    const key = at.join(' AND ') + ' || ' + rule.selector.replace(/\s*,\s*/g, ', ');

    const decls = rule.nodes.map((d) => {
      if (d.type === 'decl') return d.prop + ':' + d.value;
      if (d.type === 'rule') return '@' + d.selector + '{' + d.nodes.map((x) => x.prop + ':' + x.value).join(';') + '}';
      return d.type;
    });

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      file: name,
      line: rule.source.start.line,
      selector: rule.selector,
      media: at.join(' AND ') || '(top level)',
      decls,
      body: rule.nodes.map((d) => d.toString()).join('; ')
    });
  });
}

/* ------------------------------------------------------------------ */

const dupes = [...groups.entries()]
  .filter(([, list]) => list.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

let identical = 0;
let different = 0;

console.log('Selectors written more than once');
console.log('='.repeat(68));

for (const [key, list] of dupes) {
  /* Same declarations, written the same way? */
  const sigs = new Set(list.map((r) => r.decls.join(';')));
  const same = sigs.size === 1;

  console.log('\n' + (same ? 'SAME    ' : 'DIFFERENT') + '  ' + list[0].selector.slice(0, 60) +
    '   [' + list[0].media + ']');
  list.forEach((r) => {
    console.log('    ' + r.file + ':' + r.line + '   ' + r.decls.join('; ').slice(0, 58));
  });

  if (same) identical++; else different++;
}

console.log('\n' + '='.repeat(68));
console.log('Summary');
console.log('='.repeat(68));
console.log('  selectors written more than once   ' + dupes.length);
console.log('  the copies say the same thing       ' + identical);
console.log('  the copies say different things     ' + different);
console.log('');
