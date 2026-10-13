/**
 * Find published products whose card would render with no image.
 *
 * A product card with an empty image slot is worse than no card: it looks
 * like a broken page rather than an unfinished one, and a wholesale buyer
 * cannot judge a clock from its name and a price. Six of seven were like
 * this when this check was written, which is not visible from any other
 * angle — the page builds, the type checks, and the grid renders.
 *
 * Reads the rendered category pages rather than the database, because what
 * matters is what the card shows, and that is the product's image list
 * rather than its image column.
 *
 *   node scripts/check-product-images.js
 */
const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';

const CATS = [
  'wall-clocks', 'alarm-clocks', 'table-desk-clocks',
  'metal-clocks', 'wood-clocks', 'clock-movements'
];

(async () => {
  let total = 0;
  const missing = [];

  for (const c of CATS) {
    let html = '';
    try {
      html = await (await fetch(`${HOST}/products/${c}?t=${Date.now()}`)).text();
    } catch (e) {
      console.log(`  (${c} — ${e.message})`);
      continue;
    }

    /* Each card starts at its image container; the slice is short enough
       that a card's own body cannot reach into the next one's. */
    for (const card of html.split('<div class="c-visual">').slice(1)) {
      total++;
      const head = card.slice(0, 220);
      if (!/<img/.test(head)) {
        const name = (card.match(/<h3[^>]*>([^<]*)/) || [])[1] || '(unnamed)';
        missing.push({ cat: c, name: name.trim() });
      }
    }
  }

  console.log(`\n产品卡片 ${total} 个，缺图 ${missing.length} 个\n`);

  if (!missing.length) {
    console.log('所有产品都有图片。');
    process.exit(0);
  }

  for (const m of missing) console.log(`  ${m.cat}/${m.name}`);
  console.log('\n空图卡片比没有这个产品更伤：买家看不到钟面、材质和尺寸。');
  process.exit(1);
})();
