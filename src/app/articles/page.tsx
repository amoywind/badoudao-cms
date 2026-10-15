import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { all, getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { InquiryCTA } from '../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Article index — buying guides and reference material.
 *
 * Paired with /news/ (company updates). Both read the `posts` table and
 * differ only in the `type` column, which keeps one publishing queue in
 * the admin rather than two parallel systems.
 *
 * /blog/ still works and redirects here, so old links and the sitemap
 * keep resolving.
 */

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  published_at: string;
};

async function load(): Promise<{ posts: Post[]; s: SiteSettings }> {
  const [rows, s] = await Promise.all([
    all(
      `SELECT slug, title, excerpt, cover, published_at
         FROM posts
        WHERE status = 'published' AND type = 'article'
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 60`
    ).catch(() => []),
    getSettings().catch(() => ({} as SiteSettings))
  ]);
  return { posts: rows as Post[], s };
}

export async function generateMetadata() {
  const { posts } = await load();

  return buildMeta({
    title: 'Quartz Clock Buying Guides — MOQ, Pricing, Certification | Badoudao',
    description:
      'Practical guides for buyers of quartz clocks: how MOQ works, Ex Works vs FOB pricing, CE and RoHS requirements, lead times and how to vet a Chinese manufacturer.',
    keywords:
      'quartz clock buying guide, clock MOQ, ex works pricing, quartz clock certification',
    path: '/articles/'
  });
}

export default async function ArticlesPage() {
  const { posts, s } = await load();

  return (
    <div className="site">

      <TopBar />
      <Header />

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">Articles</div>
            <h1>Quartz clock buying guides</h1>
            <p className="sec-sub">
              Written for importers and distributors — the questions that come up
              before placing a first order, answered plainly.
            </p>
          </div>
        </div>

        <section>
          <div className="wrap">
            {posts.length === 0 ? (
              <div className="empty-state">
                <h3>Guides are being written</h3>
                <p>
                  A few are in progress. In the meantime, send us your
                  requirements and we reply within {s.quoteHours || 12} hours.
                </p>
              </div>
            ) : (
              <div className="grid-3">
                {posts.map((p, i) => (
                  <Link key={p.slug} href={`/articles/${p.slug}/`} className="card">
                    <div className={`c-visual${p.cover ? ' has-img' : ''}`}>
                      {p.cover && (
                        <img
                          src={p.cover}
                          alt={p.title}
                          decoding="async"
                          {...(i === 0 ? { fetchpriority: 'high' } : { loading: 'lazy' })}
                        />
                      )}
                    </div>
                    <div className="c-body">
                      <h3 style={{ fontSize: 17 }}>{p.title}</h3>
                      {p.excerpt && (
                        <p style={{ fontSize: 13.5 }}>{p.excerpt.slice(0, 140)}…</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="alt">
          <div className="wrap">
            <InquiryCTA label="Still have a question?" />
          </div>
        </section>
      </main>

      <Footer />
        </div>

  );
}