const fs = require('fs');
const path = require('path');

/**
 * Fail if responsive.css contains a rule that can reach the admin.
 *
 * The admin shares the root layout and therefore every stylesheet the
 * front end imports. The responsive layer needs bare element names — h1,
 * section, table — because wrapping each public element in a class is a
 * larger change than the problem deserves, and an unscoped `table {
 * display: block }` is enough to dismantle every data table in the admin.
 *
 * That is what happened: the rule was written for a phone product grid and
 * landed on the enquiries table instead. admin.css declares table { width:
 * 100% } but not display, so it lost.
 *
 * Parsed line by line rather than with a selector regex. Two earlier
 * attempts failed on a selector list spread over several lines: the regex
 * matched across the newline and reported the fragments inside
 * :where(...) as if they were selectors of their own, which they are not.
 * A rule whose selector starts on one line and ends on another is common
 * enough here that reading it the way a person does is the only reliable
 * option.
 */
const DIR = path.join(__dirname, '..', 'src', 'app');
const FILE = path.join(DIR, 'responsive.css');

const ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a', 'span', 'section', 'table', 'th', 'td',
  'ul', 'ol', 'li', 'img', 'button', 'input', 'form', 'label', 'article'
]);

const css = fs.readFileSync(FILE, 'utf8');

/* Strip comments across line boundaries, preserving line count so reported
   line numbers stay true. A single-line regex misses a comment whose
   terminator sits on a later line, and the words inside it then read as
   selectors, which produced thirty false positives the first time. */
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const lines = stripped.split('\n');

const offenders = [];
let buf = '';       // accumulated selector text
let bufLine = 0;
let depth = 0;      // inside :where( etc.

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNo = i + 1;

  if (depth === 0 && line.trim() === '') continue;

  const braceAt = line.indexOf('{');

  if (depth === 0) {
    /* Still building the selector. */
    if (braceAt >= 0) {
      buf += line.slice(0, braceAt);
      check(buf, bufLine || lineNo, line.slice(braceAt));
      buf = '';
      depth = 1;
    } else {
      if (!buf) bufLine = lineNo;
      buf += line;
    }
    continue;
  }

  /* Inside a declaration block: track nesting for functional pseudo-classes
     that contain braces, which none here do, so depth stays 1 until "}". */
  const closeAt = line.indexOf('}');
  if (closeAt >= 0) depth = 0;
}

function check(selector, line, declLine) {
  const sel = selector.trim();
  if (!sel) return;
  if (sel.startsWith('@')) return;

  /* Split a selector list on commas that are not inside brackets. */
  let depth2 = 0;
  let cur = '';
  const parts = [];
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth2++;
    else if (ch === ')' || ch === ']') depth2--;
    if (ch === ',' && depth2 === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  parts.push(cur);

  for (const raw of parts) {
    let s = raw.trim();
    if (!s) continue;

    /* Any class or id means the rule cannot match an admin element that
       does not carry it. */
    if (/[.#][a-zA-Z_-]/.test(s)) continue;

    /* Universal or bare pseudo: matches nothing on its own. */
    if (/^[*:]/.test(s)) continue;

    /* Remove every functional pseudo-class whole, brackets included. */
    let prev;
    do { prev = s; s = s.replace(/:[a-zA-Z-]+(\([^()]*\))?/g, ''); } while (s !== prev);
    s = s.trim();
    if (!s || s.startsWith('*')) continue;

    /* Now every remaining word must be an element we care about. */
    for (const token of s.split(/[\s>+~,]+/)) {
      const el = token.trim();
      if (!el || el.includes('.') || el.includes('#')) continue;
      if (ELEMENTS.has(el.toLowerCase())) {
        offenders.push({ line, sel: s, el, decl: declLine.trim().slice(0, 60) });
        break;
      }
    }
  }
}

if (!offenders.length) {
  console.log('OK  responsive.css — 没有可泄漏到后台的规则');
  process.exit(0);
}

console.log(`NG  responsive.css — ${offenders.length} 条可泄漏到后台:\n`);
const seen = new Set();
for (const o of offenders) {
  const key = o.line + o.sel;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  行 ${o.line}  ${o.sel}`);
  console.log(`      { ${o.decl}`);
}
console.log('\n需要加 .site 前缀（前台 <body> 已有该 class）。');
process.exit(1);