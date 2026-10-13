/**
 * Check every internal link on the site for a 404.
 *
 * The home page linked to /certification while the page lives at
 * /p/certification. Next.js prefetches links that are in the viewport, so
 * the browser fired a request for a page that does not exist and logged a
 * 404 on every home page visit. Nobody clicking anything would ever have
 * noticed, which is the worst part: the page looked fine and worked fine
 * right up until someone clicked "Read the full compliance note".
 *
 * Two things are checked, because they fail differently:
 *
 *   1. Links in the rendered HTML of each page, deduplicated, fetched
 *      with the site's own origin so relative paths resolve.
 *   2. Links in the source, so a link that is only reachable from one
 *      branch of a component is caught before it ships.
 *
 *   node scripts/check-links.js            # against the live site
 *   SITE_BASE=http://localhost:3000 node scripts/check-links.js
 */
const fs = require('fs');
const path = require('path');

const BASE = (process.env.SITE_BASE || 'https://www.oemwallclocks.com').replace(/\/$/, '');

const PAGES = [
  '/',
  '/products',
  '/products/wall-clocks',
  '/p/factory',
  '/p/quality',
  '/p/certification',
  '/contact',
  '/articles',
  '/news',
  '/p/oem-odm',
  '/p/small-batch',
  '/sitemap.xml'
];

/* Paths that are expected to be missing rather than broken: admin areas
   need a session, and the enquiry endpoint is a POST target. */
const IGNORE = [
  /^\/admin/,
  /^\/api/,
  /^\/_next/,
  /^\/media/,
  /* Cloudflare rewrites mailto addresses into this path and decodes them
     with a script it injects. The bare request 404s by design; it is not
     a broken link, and it is not ours to fix. */
  /^\/cdn-cgi\//,
  /\.(xml|txt|ico|png|jpg|webp|avif|svg|woff2?)$/i,
  /^\/products\/[^/]+\/[^/]+\/[^/]+\/?$/   /* deep product paths need a real id */
];

const isIgnored = (u) => IGNORE.some((re) => re.test(u));

/** Absolute internal URLs only: a mailto, tel or external host is not ours to check. */
function internal(url, base) {
  if (!url) return null;
  if (/^(mailto:|tel:|javascript:|#)/i.test(url)) return null;
  let abs;
  try { abs = new URL(url, base + '/'); } catch { return null; }
  const baseHost = new URL(base).host;
  if (abs.host !== baseHost) return null;
  if (isIgnored(abs.pathname)) return null;
  return abs.pathname + (abs.search || '');
}

(async () => {
  /* ---- 1. Navigation integrity ------------------------------------------
     Two entries sharing a nav_order means one of them is dropped from the
     rendered nav, silently: the query orders by a column that is no longer
     unique and neither row is wrong on its own. It happened here when
     oem-odm was given order 2 and nav-products already had it, and the only
     symptom was a missing link nobody could explain.

     Checked against the live nav so it catches what is actually rendered,
     not what the database intends. */
  const navCheck = await fetch(BASE + '/').then((r) => r.text()).catch(() => '');
  const navItems = navCheck
    ? [...navCheck.matchAll(/<nav class="menu">([\s\S]*?)<\/nav>/g)]
        .flatMap((m) => [...m[1].matchAll(/>([^<>]{2,22})<\/a>/g)].map((x) => x[1].trim()))
        .filter((t) => !/View all/i.test(t))
    : [];

  console.log('导航项:', navItems.join(' | ') || '(未取到)');

  const EXPECTED = ['Home', 'Products', 'OEM / ODM', 'Small Batch',
                    'Factory', 'Quality', 'Cases', 'Contact'];
  const missing = EXPECTED.filter((e) => !navItems.some((n) => n === e));
  const dupes = navItems.filter((n, i) => navItems.indexOf(n) !== i);
  const extra = navItems.filter((n) => !EXPECTED.includes(n));

  if (missing.length) {
    console.log(`\n导航缺失: ${missing.join(', ')}`);
    console.log('  通常是 nav_order 撞号，排序时某一项被挤掉。');
  }
  if (dupes.length) console.log(`\n导航重复: ${dupes.join(', ')}`);
  if (extra.length) console.log(`\n导航多出: ${extra.join(', ')}`);

  const navFailed = missing.length > 0 || dupes.length > 0;

  /* ---- 2. Link reachability -------------------------------------------- */
  const seen = new Map();          // url -> pages that link to it

  for (const p of PAGES) {
    let html;
    try {
      const res = await fetch(BASE + p);
      if (!res.ok) { console.log(`  (跳过 ${p} — ${res.status})`); continue; }
      html = await res.text();
    } catch (e) {
      console.log(`  (跳过 ${p} — ${e.message})`);
      continue;
    }

    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const u = internal(m[1], BASE);
      if (!u) continue;
      if (!seen.has(u)) seen.set(u, new Set());
      seen.get(u).add(p);
    }
  }

  /* Source scan: a link that only appears in a component not rendered on
     the public pages would otherwise be missed entirely. */
  const SRC = path.join(__dirname, '..', 'src', 'app');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'admin') walk(full); continue; }
      if (!/\.(tsx|ts)$/.test(e.name)) continue;
      const src = fs.readFileSync(full, 'utf8');
      for (const m of src.matchAll(/href=["'`](\/[^"'`{}]*)["'`]/g)) {
        const u = internal(m[1], BASE);
        if (u) {
          if (!seen.has(u)) seen.set(u, new Set());
          seen.get(u).add('src:' + path.relative(SRC, full));
        }
      }
    }
  };
  if (fs.existsSync(SRC)) walk(SRC);

  const urls = [...seen.keys()].sort();
  console.log(`\n检查 ${urls.length} 个站内链接\n`);

  const broken = [];
  let done = 0;
  const CONC = 6;

  async function worker() {
    while (urls.length) {
      const u = urls.shift();
      try {
        const r = await fetch(BASE + u, { redirect: 'manual' });
        if (r.status >= 400) broken.push({ url: u, status: r.status, from: [...seen.get(u)] });
      } catch (e) {
        broken.push({ url: u, status: 'ERR', from: [...seen.get(u)] });
      }
      done++;
      if (done % 20 === 0) process.stdout.write(`  ${done}/${urls.length + done - 1}\r`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  if (!broken.length && !navFailed) {
    console.log('全部链接正常，导航完整。');
    process.exit(0);
  }

  if (broken.length) {
    console.log(`\n${broken.length} 个链接无效:\n`);
    for (const b of broken) {
      console.log(`  ${String(b.status).padEnd(5)} ${b.url}`);
      console.log(`        引用自: ${b.from.slice(0, 3).join(', ')}${b.from.length > 3 ? ' …' : ''}`);
    }
  }

  process.exit(1);
})();