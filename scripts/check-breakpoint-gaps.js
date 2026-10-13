/**
 * Find layout properties that are overridden in one breakpoint and then
 * left at the wider value in the next one down.
 *
 * The hero bug was this: 1024px set two columns, 860px set one, and
 * 600px never mentioned it — so a phone inherited two columns from the
 * 1024px rule and the text overflowed the screen. Nothing errors, the CSS
 * is valid, and only a screenshot shows it.
 *
 * Reads responsive.css and reports any selector that appears in a wider
 * breakpoint with a multi-column value but is absent from every narrower
 * one. That is a gap, not always a mistake — a property legitimately kept
 * across two ranges is fine — so it is reported for review.
 *
 *   node scripts/check-breakpoint-gaps.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'app', 'responsive.css');
const src = fs.readFileSync(FILE, 'utf8');

/* Ordered widest first, so "narrower" means later in this list. */
const ORDER = [
  { at: 1600, min: true },
  { at: 1024 },
  { at: 860 },
  { at: 600 },
  { at: 380 }
];

/* Split the file into one bucket per breakpoint. */
const buckets = ORDER.map(() => '');
let current = -1;
let depth = 0;

for (const line of src.split('\n')) {
  const open = line.match(/@media\s*\((max|min)-width:\s*(\d+)px\)/);
  if (open) {
    const idx = ORDER.findIndex((b) => b.at === parseInt(open[2], 10));
    current = idx >= 0 ? idx : -1;
    depth = 1;
    continue;
  }
  if (current < 0) continue;
  depth += (line.match(/\{/g) || []).length;
  depth -= (line.match(/\}/g) || []).length;
  if (depth <= 0 && !line.includes('{')) { current = -1; continue; }
  buckets[current] += line + '\n';
}

/* Every selector that sets more than one column. */
const multi = new Map();      // selector -> widest breakpoint that sets it
for (let i = 0; i < buckets.length; i++) {
  /* Comments run into the selector text when a grouped rule has one above
     it, and a comment containing a brace unbalances the block count. Strip
     them before anything else looks at the text. */
  const text = buckets[i].replace(/\/\*[\s\S]*?\*\//g, '');

  for (const m of text.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const decl = m[2];
    const cols = decl.match(/grid-template-columns:\s*([^;]+)/);
    if (!cols) continue;
    const value = cols[1].trim();
    if (!/\b1fr\b.*\b1fr\b|\brepeat\(\s*[2-9]/.test(value)) continue;
    if (!multi.has(sel) || ORDER[i].at < ORDER[multi.get(sel).idx].at) {
      multi.set(sel, { value, idx: i, at: ORDER[i].at });
    }
  }
}

const gaps = [];
for (const [sel, info] of multi) {
  /* A selector can be listed inside a grouped rule — ".a, .b { … }" — so
     look for it among the comma-separated parts rather than requiring the
     whole rule to be that one selector. Without this, every grouped rule
     reads as a gap. */
  const fixedNarrow = [];
  for (let i = info.idx + 1; i < buckets.length; i++) {
    let found = false;
    for (const m of buckets[i].matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      /* A grouped rule wraps across lines, so the part this selector
         appears in can start or end mid-name. Compare on collapsed text
         rather than the trimmed fragment. */
      const hay = m[1].replace(/\s+/g, ' ');
      if (!hay.includes(sel)) continue;
      if (/grid-template-columns:\s*1fr\s*[;}]/.test(m[2])) found = true;
    }
    if (found) fixedNarrow.push(ORDER[i].at);
  }

  /* The phone bucket is the one that has to be right: if 600px does not
     set it to one column, a phone inherits the multi-column value. */
  if (!fixedNarrow.includes(600) && info.at > 600) {
    gaps.push({ sel, value: info.value, at: info.at, fixedNarrow });
  }
}

if (!gaps.length) {
  console.log('No breakpoint gaps: every multi-column layout is collapsed by 600px.');
  process.exit(0);
}

console.log(`${gaps.length} selector(s) set to multiple columns but never collapsed for phones:\n`);
for (const g of gaps) {
  console.log(`  ${g.sel}`);
  console.log(`      set at ${g.at}px to "${g.value}"`);
  console.log(`      collapsed at: ${g.fixedNarrow.length ? g.fixedNarrow.join(', ') : 'never'}`);
}
process.exit(1);