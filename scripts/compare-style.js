/* Compare two style snapshots.
 *
 * Each line is a class and the computed values of the properties that
 * decide how it looks. If the two files differ on a line, something the
 * browser paints is different.
 *
 * Usage: node scripts/compare-style.js <before> <after>
 */
const fs = require('fs');

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.log('usage: node scripts/compare-style.js <before> <after>');
  process.exit(2);
}

const A = fs.readFileSync(a, 'utf8').split('\n');
const B = fs.readFileSync(b, 'utf8').split('\n');

if (A.length !== B.length) {
  console.log(`行数不同: ${A.length} → ${B.length}`);
}

let diffs = 0;
let blocks = 0;
let block = '';
const byBlock = new Map();

for (let i = 0; i < Math.max(A.length, B.length); i++) {
  const la = A[i] === undefined ? '' : A[i];
  const lb = B[i] === undefined ? '' : B[i];

  if (la.startsWith('### ')) {
    if (block) blocks++;
    block = la;
    continue;
  }
  if (la !== lb) {
    diffs++;
    if (!byBlock.has(block)) byBlock.set(block, []);
    const list = byBlock.get(block);
    if (list.length < 4) {
      const pa = la.split('|');
      const pb = lb.split('|');
      const props = [];
      for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
        if (pa[k] !== pb[k]) props.push(`${pa[k]}=${pa[k]}→${pb[k]}`);
      }
      list.push(`   ${pa[0]}  ${props.join('  ')}`);
    }
  }
}
if (block) blocks++;

console.log(`${blocks} 个页面宽度组合，${diffs} 处计算样式不同`);
if (diffs) {
  console.log();
  for (const [b, list] of byBlock) {
    console.log(b);
    list.forEach(l => console.log(l));
    console.log();
  }
}
process.exit(diffs ? 1 : 0);
