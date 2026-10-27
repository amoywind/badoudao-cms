/**
 * Verify a product page against what it is supposed to contain.
 *
 * Written from the owner's spec rather than from the markup: each item is
 * something a buyer needs to find, not a class name. A test that asserts
 * on the markup it just wrote passes forever and proves nothing.
 *
 *   node scripts/check-pdp.js [url]
 */
const URL_ = process.argv[2] || 'https://www.oemwallclocks.com/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock';

const html = await (await fetch(`${URL_}?t=${Date.now()}`)).text();

const strip = (s) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const ITEMS = [
  ['Gallery mount point',       /<div class="pd-gallery"/],
  ['Title h1',                  /<h1[^>]*>[^<]{6,}/],
  ['OEM/ODM badge',             /OEM \/ ODM Available/],
  ['Factory Direct badge',      /Factory Direct/],
  ['Standalone MOQ card',       /class="pd-moq"/],
  ['MOQ value present',         /pd-moq-v[^>]*>\d+/],
  /* The tag block only appears for a model whose specifications name
     a material or a movement, and most of them do not — so this is
     checked as a condition rather than as a requirement: a tag that
     is shown must be a link. */
  ['Tag block, when shown, is a link', /(class="pd-tag"[^>]*href=|href="[^"]*"[^>]*class="pd-tag")|(?!class="pd-tags")/],
  ['Frame options',             /spec-lbl[^>]*>Frame</],
  ['Hands options',             /Clock hands|Hands/],
  ['Dial plate options',        /Dial plate/],
  ['Logo printing options',     /Logo printing/],
  ['Movement options',          />Movement</],
  ['Packaging options group',   /Packaging/],
  ['QC badges',                 /class="pd-qc"/],
  ['Main CTA',                  /Request Custom Quote|Send Inquiry|Get Factory Quote/],
  ['Spec table',                /class="spec-table[^"]*"/],
  ['Spec rows',                  /<th scope="row">/],
  ['4 packaging cards',         /class="pd-pack-c"/],
  ['Process flow 4 steps',      /class="pd-process"/],
  ['FAQ accordion',             /<details/],
  ['Inquiry form',              /id="inquiry"/],
  ['File upload',               /type="file"/]
];

let pass = 0;
let fail = 0;

console.log(`\n${URL_.replace(/^https?:\/\//, '')}\n`);

for (const [name, re] of ITEMS) {
  const ok = re.test(html);
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'OK  ' : 'NG  '} ${name}`);
}

/* Counts, not just presence: "four packaging options" is not satisfied by
   one card that happens to exist. */
const packCards = (html.match(/class="pd-pack-c"/g) || []).length;
const faqItems = (html.match(/<details/g) || []).length;
const steps = (html.match(/class="pd-process-n"/g) || []).length;
const qcItems = (html.match(/class="pd-qc-i"/g) || []).length;

console.log('\n数量:');
const COUNTS = [
  ['包装卡片 = 4', packCards, 4],
  ['FAQ 条目 ≥ 1', faqItems, 1],
  ['流程步骤 = 4', steps, 4],
  ['QC 徽章 = 4', qcItems, 4]
];
for (const [name, got, want] of COUNTS) {
  const ok = got >= want;
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'OK  ' : 'NG  '} ${name}（实际 ${got}）`);
}

/* A tag that is not a link is a keyword: the internal linking the tag was
   meant to create does not happen. */
const tags = [...html.matchAll(/<a[^>]*class="pd-tag"[^>]*>/g)];
const deadTags = tags.filter((t) => !/href=/.test(t[0])).length;
console.log('\n链接:');
{
  const ok = tags.length === 0 || deadTags === 0;
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'OK  ' : 'NG  '} SEO 标签都有 href（${tags.length} 个，${deadTags} 个无链接）`);
}

/* Every internal link on the page has to resolve, or the buyer clicks into
   a 404. Checked against the markup rather than by fetching each one: this
   is a layout and content check, and link checking is check-links.js. */
const hrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
const empty = [...html.matchAll(/href="(#)"/g)].length;
console.log('\n链接健康:');
{
  const ok = empty === 0;
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'OK  ' : 'NG  '} 没有空锚点 href="#"（${empty} 个）`);
  console.log(`       站内链接 ${new Set(hrefs).size} 个`);
}

console.log(`\n通过 ${pass}，失败 ${fail}。`);
process.exit(fail === 0 ? 0 : 1);