/**
 * Dynamic sitemap.xml.
 *
 * Built at request time from D1 rather than generated at build time — the
 * admin can publish a product or a blog post at any moment and Google
 * discovers it on the next crawl without a redeploy.
 *
 * Only `published` rows are listed; drafts and archived content must never
 * leak into search results.
 */
import { all, getSettings } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_SITE = 'https://oemwallclocks.com';

/* escape the five XML entities — a stray & in a product name would make the
   whole feed unparseable and Google would silently discard it. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type Entry = { priority?: string; changefreq?: string; lastmod?: string };

function url(loc: string, { priority = '0.6', changefreq = 'monthly', lastmod }: Entry = {}) {
  return `  <url>
    <loc>${esc(loc)}</loc>${lastmod ? `\n    <lastmod>${esc(lastmod)}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function stamp(v) {
  const s = String(v ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined;
}

export async function GET() {
  const [settings, pages, posts, products, cats] = await Promise.all([
    getSettings().catch(() => ({}) as Record<string, string>),
    /* Only documents. Menu entries and fixed-route SEO records share this
       table but are not URLs of their own. The old LENGTH(body)>0 guess
       published them as /p/nav-home and friends — soft 404s — and broke
       outright as soon as a menu row acquired any content. `kind` says
       what the row is, so nothing has to be inferred. */
    all(
      "SELECT id, updated_at FROM pages " +
        "WHERE status = 'published' AND kind = 'content' ORDER BY sort_order"
    ).catch(() => []),
    all(
      `SELECT slug, type, updated_at FROM posts WHERE status = 'published'
        ORDER BY created_at DESC`
    ).catch(() => []),
    all("SELECT slug, category, updated_at FROM products WHERE status = 'published'").catch(
      () => []
    ),
    all('SELECT id FROM categories').catch(() => [])
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const entries: string[] = [];

  /* Prefer the custom domain once one is set in the admin, so the sitemap
     stops advertising the pages.dev address after a domain is attached. */
  const SITE = String(settings.siteUrl || '').trim().replace(/\/+$/, '') || DEFAULT_SITE;

  /* The homepage changes whenever anything is published, so it always claims
     today's date. */
  entries.push(url(`${SITE}/`, { priority: '1.0', changefreq: 'weekly', lastmod: today }));
  entries.push(url(`${SITE}/products`, { priority: '0.9', changefreq: 'weekly' }));

  cats.forEach((c) => {
    entries.push(url(`${SITE}/products/${c.id}`, { priority: '0.8', changefreq: 'weekly' }));
  });

  /* A product URL only works if its category landing page exists, so keep the
     two in sync rather than trusting the slug alone. */
  const catIds = new Set(cats.map((c) => String(c.id)));
  products.forEach((p) => {
    if (!catIds.has(String(p.category))) return;
    entries.push(
      url(`${SITE}/products/${p.category}/${p.slug}`, {
        priority: '0.7',
        changefreq: 'monthly',
        lastmod: stamp(p.updated_at)
      })
    );
  });

  pages.forEach((p) => {
    entries.push(
      url(`${SITE}/p/${p.id}`, {
        priority: '0.6',
        changefreq: 'monthly',
        lastmod: stamp(p.updated_at)
      })
    );
  });

  /* The four routes that are code rather than a database page. They are
     real, indexable pages and they were missing from the feed entirely
     because nothing scans the routes directory. */
  [
    ['/custom-services', '0.7'],
    ['/components', '0.7'],
    ['/craft-qc', '0.7'],
    ['/about-us', '0.7'],
    /* The customizer is its own page and its own landing page. A buyer
       who searches for a configurator or for a clock specification tool
       needs a URL that says what it is, not the home page with an
       anchor on it. */
    ['/customizer', '0.8']
  ].forEach(([path, priority]) => {
    entries.push(url(`${SITE}${path}`, { priority, changefreq: 'monthly', lastmod: today }));
  });

  /* Articles and company news are separate listings driven by posts.type, so
     each gets its own index URL and its own detail URLs. */
  const articles = posts.filter((p) => (p.type || 'article') === 'article');
  const news = posts.filter((p) => p.type === 'news');

  entries.push(url(`${SITE}/articles`, { priority: '0.7', changefreq: 'weekly' }));
  entries.push(url(`${SITE}/news`, { priority: '0.5', changefreq: 'weekly' }));

  articles.forEach((b) => {
    entries.push(
      url(`${SITE}/articles/${b.slug}`, {
        priority: '0.6',
        changefreq: 'monthly',
        lastmod: stamp(b.updated_at)
      })
    );
  });

  /* News is trust content, not search content — indexed but kept below the
     guides so it never competes with them for the same query. */
  news.forEach((n) => {
    entries.push(
      url(`${SITE}/news/${n.slug}`, {
        priority: '0.4',
        changefreq: 'monthly',
        lastmod: stamp(n.updated_at)
      })
    );
  });

  /* The contact page is the main conversion URL — it carries the same
     enquiry form as the #inquiry anchor but has a keyword-matchable slug. */
  entries.push(url(`${SITE}/contact`, { priority: '0.9', changefreq: 'monthly' }));

  /* Content lives under /admin and /api. They are already blocked in
     robots.txt; excluding them here keeps the feed honest as well. */
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    }
  });
}