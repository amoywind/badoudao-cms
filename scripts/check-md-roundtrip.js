/**
 * The editor round trip: HTML in the database, Markdown in the textarea.
 *
 * A page body is stored as HTML and edited as Markdown, so every save is a
 * conversion in each direction. htmlToMd was losing every heading marker:
 * it replaced </h2> with a blank line before the heading rule ran, which
 * destroyed the <h2…>…</h2> pattern the rule needs, so a heading came back
 * as bare prose — and "1. Incoming Material Inspection" is an ordered list,
 * so one save turned a heading into a list and it stayed that way.
 *
 * That is invisible until a heading is numbered, which is exactly how
 * certification and quality pages are written, and it is invisible to
 * every other check because the editor is a client component.
 *
 *   node scripts/check-md-roundtrip.js
 */
import { mdToHtml, htmlToMd } from '../src/lib/markdown.ts';

let failures = 0;

/* [name, html, expected markdown fragment] */
const CASES = [
  ['h1', '<h1>Certification &amp; Compliance</h1>', '# Certification'],
  ['h2 plain', '<h2>Incoming Inspection</h2>', '## Incoming Inspection'],
  ['h2 numbered', '<h2>1. Incoming Material Inspection</h2>', '## 1. Incoming'],
  ['h3 numbered', '<h3>1.1 Movement Verification</h3>', '### 1.1 Movement'],
  ['h2 with year', '<h2>2024 Product Range</h2>', '## 2024 Product Range'],
  ['h4', '<h4>Detail</h4>', '#### Detail'],
  ['bold', '<p>a <strong>heavy</strong> word</p>', '**heavy**'],
  ['em', '<p>a <em>soft</em> word</p>', '*soft*'],
  ['ul', '<ul><li>One</li><li>Two</li></ul>', '- One'],
  ['ol', '<ol><li>One</li><li>Two</li></ol>', '1. One'],
  ['quote', '<blockquote><p>MOQ applies.</p></blockquote>', '> MOQ applies.'],
  ['link', '<p><a href="/p/quality">Quality</a></p>', '[Quality](/p/quality)'],
  ['hr', '<p>a</p><hr><p>b</p>', '---']
];

/* Round trip: the heading level must survive, which is the whole point. */
const ROUND = [
  ['h2 numbered survives', '<h2>1. Incoming Material Inspection</h2>', /^<h2/],
  ['h3 numbered survives', '<h3>1.1 Movement Verification</h3>', /^<h3/],
  ['h2 plain survives', '<h2>Quality Control</h2>', /^<h2/],
  ['quote does not become a heading', '<blockquote><p>1. not a heading</p></blockquote>', /<blockquote|1\. not/]
];

console.log('=== htmlToMd 输出 ===\n');
for (const [name, html, want] of CASES) {
  const md = htmlToMd(html);
  const ok = md.includes(want);
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'NG  '} ${name.padEnd(26)} ${JSON.stringify(md.trim().slice(0, 50))}`);
  if (!ok) console.log(`        期望包含: ${JSON.stringify(want)}`);
}

console.log('\n=== 往返后标签级别 ===\n');
for (const [name, html, re] of ROUND) {
  const back = mdToHtml(htmlToMd(html));
  const ok = re.test(back.trim());
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'NG  '} ${name.padEnd(26)} ${JSON.stringify(back.trim().slice(0, 46))}`);
}

/* The failing case from the report, verbatim. */
const REAL = '<h2>1. Incoming Material Inspection</h2>';
const md = htmlToMd(REAL);
const back = mdToHtml(md);
const stillHeading = /^<h2/.test(back.trim());
if (!stillHeading) {
  failures++;
  console.log('\nNG   真实案例回退');
  console.log(`        ${JSON.stringify(md.trim())} → ${JSON.stringify(back.trim())}`);
} else {
  console.log('\nOK   真实案例保持标题');
}

console.log(failures === 0 ? '\n全部通过。' : `\n${failures} 项失败。`);
process.exit(failures === 0 ? 0 : 1);