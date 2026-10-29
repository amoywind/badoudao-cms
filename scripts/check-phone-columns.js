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

/* Is this layout still on the site?

   The list above is a list of layouts, not of rules. A layout that has
   gone — the showroom grid, the trust bar, the quality page — is no
   longer written in any component, and asking for a phone rule for it
   asks for a rule about something that is not there. The failure it
   reports is not a layout that is wrong on a phone; it is a layout
   that is not on the site at all.

   So the source is asked first. A layout nothing uses is reported as
   gone rather than as broken. */
const cp = require('child_process');
const source = cp.execSync(
  'find src -name "*.tsx" -o -name "*.ts" | xargs cat'
).toString();

function isUsed(sel) {
  /* The last part of the selector is the class it is named for. */
  const m = sel.match(/\.([A-Za-z][\w-]*)\s*$/);
  if (!m) return true;
  const name = m[1];
  return new RegExp('\\b' + name.replace(/-/g, '[\\s\\-]') + '\\b').test(source);
}

console.log('=== 600px（手机）单列检查 ===\n');
for (const sel of SELECTORS) {
  if (!isUsed(sel)) {
    console.log(`  --  ${sel.padEnd(20)} 已不在页面上，无需手机规则`);
    continue;
  }
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