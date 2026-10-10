import Link from 'next/link';
import { notFound } from 'next/navigation';
import { one, all, getSettings } from '@/lib/db';
import { TopBar, Header, Footer } from '../../SiteChrome';
import { InquiryForm } from '../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function PostPage({ params }) {
  const post = await one(
    "SELECT * FROM posts WHERE slug = ? AND status = 'published'",
    params.slug
  ).catch(() => null);

  if (!post) notFound();

  const [s, recent] = await Promise.all([
    getSettings().catch(() => ({})),
    all("SELECT slug, title FROM posts WHERE status = 'published' AND id != ? ORDER BY published_at DESC LIMIT 5", post.id)
      .catch(() => [])
  ]);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: s.siteName || 'Badoudao' },
    publisher: { '@type': 'Organization', name: s.siteName || 'Badoudao' }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/blog/">Blog</Link><span>/</span>
          <span>{post.title}</span>
        </div>
      </nav>

      <main>
        <article>
          <div className="page-head">
            <div className="wrap">
              <div className="sec-tag">Buyer Guide</div>
              <h1>{post.title}</h1>
              {post.excerpt && <p className="sec-sub">{post.excerpt}</p>}
              {post.published_at && (
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 12 }}>
                  Published {post.published_at.slice(0, 10)}
                </p>
              )}
            </div>
          </div>

          <section>
            <div className="wrap">
              <div className="content-block" dangerouslySetInnerHTML={{ __html: post.body }} />
            </div>
          </section>
        </article>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Next Step</div>
                <h2 style={{ fontSize: 30 }}>Questions after reading?</h2>
                <p className="sec-sub">
                  Tell us what you're trying to source. We reply within {s.quoteHours || 12} hours
                  with pricing and a realistic timeline.
                </p>
              </div>
              <InquiryForm />
            </div>
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <div className="wrap">
              <div className="sec-head">
                <div className="sec-tag">More Guides</div>
                <h2 style={{ fontSize: 28 }}>Keep reading</h2>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {recent.map((r) => (
                  <Link key={r.slug} href={`/blog/${r.slug}/`}
                    style={{ padding: '14px 18px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 15 }}>
                    {r.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
