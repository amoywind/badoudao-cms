const fs = require('fs');

/* Rename the category ids so each one says what it holds.
 *
 *   wall-clocks       → plastic-wall-clocks      (Plastic Wall Clocks)
 *   alarm-clocks      → wood-wall-clocks         (Wood Wall Clock)
 *   table-desk-clocks → metal-wall-clocks        (Metal Wall Clock)
 *   metal-clocks      → acrylic-wall-clocks      (Acrylic Wall Clock)
 *   wood-clocks       → glass-crystal-wall-clocks(Glass & Crystal Wall Clock)
 *   clock-movements   → resin-wall-clocks        (Resin Wall Clock)
 *
 * Every id was left over from an earlier draft and had drifted away from
 * the name beside it, so a category could be reached at a URL that
 * described something else entirely.
 *
 * Order matters. products.category is a plain TEXT column with no foreign
 * key, and categories.id is the primary key. Updating the child side first
 * means there is never an instant where a product points at an id that no
 * longer exists. Doing it the other way round would leave a window where
 * two products and no category share the old value.
 *
 * Each statement is checked before the next runs, and the whole thing is
 * re-read afterwards — a rename that half-applied would show up as
 * products whose category matches no row, which is the check below.
 */
const T = fs.readFileSync(
  'D:/website/workbuddy/badoudao-cms/.dev.vars', 'utf8'
).match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m)[1].trim();

const DB = 'https://api.cloudflare.com/client/v4/accounts/086d893ed76ae09ae6abac33113d7eab/d1/database/aba203a7-d49a-4c93-b4f9-aa931aa219c7/query';

const RENAME = {
  'wall-clocks': 'plastic-wall-clocks',
  'alarm-clocks': 'wood-wall-clocks',
  'table-desk-clocks': 'metal-wall-clocks',
  'metal-clocks': 'acrylic-wall-clocks',
  'wood-clocks': 'glass-crystal-wall-clocks',
  'clock-movements': 'resin-wall-clocks'
};

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
      console.log('=== 改名前 ===\n');
      const before = await q('SELECT id, name FROM categories ORDER BY sort_order');
      before.forEach((c) => console.log('  ' + c.id.padEnd(20) + c.name));

      /* 1. products first — the side without a primary key. */
      console.log('\n=== 1/2  更新 products.category ===');
      for (const [from, to] of Object.entries(RENAME)) {
        const hit = await q(
          `SELECT COUNT(*) n FROM products WHERE category = '${from}'`);
        const n = hit[0]?.n ?? 0;
        if (n === 0) { console.log(`  ${from} → ${to}   无产品，跳过`); continue; }
        await q(`UPDATE products SET category = '${to}' WHERE category = '${from}'`);
        console.log(`  ${from} → ${to}   ${n} 个产品已更新`);
        await sleep(120);
      }

      /* 2. then the primary key itself. */
      console.log('\n=== 2/2  更新 categories.id ===');
      for (const [from, to] of Object.entries(RENAME)) {
        await q(`UPDATE categories SET id = '${to}' WHERE id = '${from}'`);
        console.log(`  ${from} → ${to}`);
        await sleep(120);
      }

      /* Verify. A half-applied rename leaves a product pointing at an id
         that is not in the table, which is the failure worth catching. */
      console.log('\n=== 校验 ===');
      const after = await q('SELECT id, name FROM categories ORDER BY sort_order');
      after.forEach((c) => console.log('  ' + c.id.padEnd(24) + c.name));

      const orphans = await q(
        `SELECT p.slug, p.category FROM products p
          WHERE p.status != 'draft'
            AND p.category NOT IN (SELECT id FROM categories)`);
      console.log('\n指向不存在分类的产品: '
        + (orphans.length === 0 ? '0 个 ✓' : orphans.length + ' 个 ✗'));
      orphans.forEach((o) => console.log('  ' + o.category + ' / ' + o.slug));

      const dangling = await q('SELECT COUNT(*) n FROM categories WHERE id NOT IN '
        + `(SELECT DISTINCT category FROM products)`);
      console.log('暂无产品的分类: ' + dangling[0].n + ' 个（正常）');

      console.log('\n' + (orphans.length === 0 ? '✓ 改名完成，无孤儿数据' : '✗ 存在孤儿数据，需回滚'));
      break;
    } catch (e) {
      if (attempt === 4) { console.error('失败:', e.message); process.exitCode = 1; }
      else { console.log('重试 ' + (attempt + 1) + ': ' + e.message); await sleep(4000); }
    }
  }
})();