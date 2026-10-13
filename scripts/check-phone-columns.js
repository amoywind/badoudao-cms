const fs = require('fs');
const src = fs.readFileSync('src/app/responsive.css', 'utf8');

/* Isolate the phone bucket: from "max-width: 600px" to the next comment
   header, which is where the 380px block starts. */
const start = src.indexOf('@media (max-width: 600px)');
const end = src.indexOf('/* ---- 380px');
const phone = src.slice(start, end > start ? end : start + 2500)
  .replace(/\/\*[\s\S]*?\*\//g, '');

const SELECTORS = [
  '.hero .wrap', '.pd', '.split', '.grid-3', '.grid-2', '.related-grid',
  '.faq-grid', '.f-grid', '.fg2', '.cap-list', '.trust-grid', '.proc',
  '.drop-grid', '.wa-row', '.news-item', '.showroom-grid', '.quality-layout'
];

const SINGLE = /grid-template-columns:\s*1fr\s*[;}]/;
let bad = 0;

console.log('=== 600px（手机）单列检查 ===\n');
for (const sel of SELECTORS) {
  let found = false;
  for (const m of phone.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const hay = m[1].replace(/\s+/g, ' ');
    if (hay.includes(sel) && SINGLE.test(m[2])) { found = true; break; }
  }
  if (!found) bad++;
  console.log(`  ${found ? 'OK' : 'NG'}  ${sel.padEnd(20)} ${found ? '' : '← 未在手机断点设为单列'}`);
}

console.log(bad === 0
  ? '\n全部布局在手机断点为单列。'
  : `\n${bad} 项需要处理。`);
process.exit(bad === 0 ? 0 : 1);