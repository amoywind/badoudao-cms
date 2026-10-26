import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { all, getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { InquiryCTA } from '../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Company news.
 *
 * Factory updates, exhibitions, shipments and new production capacity.
 * Unlike /articles/ these are not written for search — they exist to prove
 * the factory is real and running, which is what decides whether a buyer
 * feels safe ordering. They share the `posts` table with articles and are
 * separated by the `type` column.
 */

type News = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  published_at: string;
};

async function load(): Promise<{ items: News[]; s: SiteSettings }> {
  const [rows, s] = await Promise.all([
    all(
      `SELECT slug, title, excerpt, cover, published_at
         FROM posts
        WHERE status = 'published' AND type = 'news'
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 40`
    ).catch(() => []),
    getSettings().catch(() => ({} as SiteSettings))
  ]);
  return { items: rows as News[], s };
}

export async function generateMetadata() {
  return buildMeta({
    title: 'Company News — Factory Updates from Badoudao Quartz Clocks',
    description:
      'Production runs, exhibition appearances and shipment records from Badoudao, a quartz clock manufacturer in China. Photographs taken on site.',
    path: '/news/'
  });
}

export default async function NewsPage() {
  const { items, s } = await load();

  return (
    <div className="site">

      <TopBar />
      <Header />

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">Company News</div>
            <h1>From the factory floor</h1>
            <p className="sec-sub">
              Production runs, exhibition appearances and shipment records.
              Photographs taken on site, not in a studio.
            </p>
          </div>
        </div>

        <section>
          <div className="wrap">
            {items.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet</h3>
                <p>
                  Factory updates will appear here. Meanwhile the factory
                  profile covers who we are and what we make.
                </p>
                <p style={{ marginTop: 18 }}>
                  <Link href="/p/factory/" className="btn btn-ghost btn-sm">
                    About the factory →
                  </Link>
                </p>
              </div>
            ) : (
              /* Newest first, single column — a timeline reads better than a
                 grid when the point is "this is recent and current". */
              <div className="news-list">
                {items.map((n) => (
                  <Link key={n.slug} href={`/news/${n.slug}/`} className="news-item">
                    {n.cover && (
                      <div className="news-thumb">
                        <img src={n.cover} alt={n.title} width={320} height={200} loading="lazy" />
                      </div>
                    )}
                    <div className="news-text">
                      {n.published_at && (
                        <div className="news-date">{String(n.published_at).slice(0, 10)}</div>
                      )}
                      <h3>{n.title}</h3>
                      {n.excerpt && <p>{n.excerpt.slice(0, 220)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="alt">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Visit or audit</div>
                <h2 style={{ fontSize: 30 }}>We welcome factory visits</h2>
                <p className="sec-sub">
                  Existing customers and serious buyers are welcome to inspect the
                  line. We reply within {s.quoteHours || 4} hours.
                </p>
              </div>
              <InquiryCTA label="Arrange a visit or ask a question" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
        </div>

  );
}