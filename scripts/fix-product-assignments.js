const fs = require('fs');

/* Put each product in a category that describes it.
 *
 * Renaming the category ids did not change where the products sat, and most
 * of them were in the wrong place:
 *
 *   Brushed Brass Metal Wall Clock   was acrylic      → metal
 *   Silent Sweep Metal Wall Clock    was plastic      → metal
 *   Solid Oak Wood Wall Clock        was glass        → wood
 *   12 Inch Round Plastic            was plastic      → unchanged, correct
 *
 * Three products are not wall clocks at all — a twin-bell alarm clock, a
 * bare movement, an MDF desk clock. There is no category for any of them
 * and the site is staying within wall clocks, so they are unpublished
 * rather than filed under something that does not fit. They keep their rows
 * and their category, so putting them back is one status change each.
 *
 *   Twelve Colours Twin-Bell Alarm Clock  → draft
 *   Silent Quartz Movement 12mm Bulk     → draft
 *   8 Inch Square MDF Desk Clock         → draft
 *
 * Verified afterwards: every published product's category matches the
 * material in its name.
 */
const T = fs.readFileSync(
  'D:/website/workbuddy/badoudao-cms/.dev.vars', 'utf8'
).match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m)[1].trim();

const DB = 'https://api.cloudflare.com/client/v4/accounts/086d893ed76ae09ae6abac33113d7eab/d1/database/aba203a7-d49a-4c93-b4f9-aa931aa219c7/query';

const MOVE = [
  ['brushed-brass-metal-wall-clock-14-inch', 'metal-wall-clocks'],
  ['silent-sweep-metal-wall-clock-10-inch', 'metal-wall-clocks'],
  ['solid-oak-wood-wall-clock-12-inch', 'wood-wall-clocks']
];

const UNPUBLISH = [
  'twelve-colours-twin-bell-alarm-clock',
  'silent-quartz-movement-12mm-bulk',
  '8-inch-square-mdf-desk-clock'
];

async function q(sql) {
  const r = await (await fetch(DB, {
    method: 'POST',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  })).json();
  if (!r.success) throw new Error(r.errors?.[0]?.message || 'query failed');
  return r.result?.[0]?.results ?? [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      console.log('=== 1. 修正分类 ===');
      for (const [slug, cat] of MOVE) {
        const hit = await q(
          `SELECT id FROM products WHERE slug = '${slug}'`);
        if (!hit.length) { console.log(`  ${slug}  找不到，跳过`); continue; }
        await q(`UPDATE products SET category = '${cat}' WHERE slug = '${slug}'`);
        console.log(`  ${slug}\n    → ${cat}`);
        await sleep(140);
      }

      console.log('\n=== 2. 转 draft ===');
      for (const slug of UNPUBLISH) {
        const hit = await q(`SELECT id FROM products WHERE slug = '${slug}'`);
        if (!hit.length) { console.log(`  ${slug}  找不到，跳过`); continue; }
        await q(`UPDATE products SET status = 'draft' WHERE slug = '${slug}'`);
        console.log(`  ${slug}  → draft`);
        await sleep(140);
      }

      console.log('\n=== 校验：全部产品 ===');
      const rows = await q(
        "SELECT slug, category, status FROM products ORDER BY status, category, slug");
      rows.forEach((p) => {
        const flag = p.status === 'draft' ? '·' : ' ';
        console.log(`  ${flag} ${p.status.padEnd(10)}${p.category.padEnd(22)}${p.slug}`);
      });

      const published = rows.filter((p) => p.status !== 'draft');
      const bad = published.filter((p) => {
        const n = p.slug;
        if (/metal|brass/.test(n) && !/metal/.test(p.category)) return true;
        if (/wood|oak|mdf/.test(n) && !/wood/.test(p.category)) return true;
        if (/plastic/.test(n) && !/plastic/.test(p.category)) return true;
        if (/acrylic/.test(n) && !/acrylic/.test(p.category)) return true;
        if (/glass|crystal/.test(n) && !/glass/.test(p.category)) return true;
        if (/resin/.test(n) && !/resin/.test(p.category)) return true;
        return false;
      });

      console.log('\n已发布: ' + published.length + ' 个，未发布: '
        + (rows.length - published.length) + ' 个');
      console.log(bad.length === 0
        ? '✓ 已发布产品的分类与材质全部一致'
        : '✗ 仍有 ' + bad.length + ' 个不匹配: ' + bad.map((b) => b.slug).join(', '));
      break;
    } catch (e) {
      if (attempt === 4) { console.error('失败:', e.message); process.exitCode = 1; }
      else { console.log('重试 ' + (attempt + 1) + ': ' + e.message); await sleep(4000); }
    }
  }
})();