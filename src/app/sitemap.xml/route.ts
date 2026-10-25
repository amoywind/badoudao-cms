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
    /* The body length comes along because a page row with no body is a
       navigation entry, not a page. The navigation lives in the same
       table as the content — that is what makes it editable from the
       admin — and the sitemap was listing every one of them as
       /p/nav-home, /p/nav-products and so on. Those are not documents;
       they are menu items pointing at routes that are already listed
       elsewhere in this feed. */
    all(
      "SELECT id, updated_at, LENGTH(COALESCE(body,'')) AS body_len FROM pages " +
        "WHERE status = 'published' ORDER BY sort_order"
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
    /* Navigation entries have no body. Listing them would put a dozen
       URLs in the feed that resolve to an empty page — a soft 404, which
       is worse than a missing URL because it tells Google the page exists
       and has no content. */
    if (!Number(p.body_len)) return;

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
    ['/about-us', '0.7']
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