import Link from 'next/link';
import { all, getSettings } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function BlogIndex() {
  const [posts, s] = await Promise.all([
    all("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 50")
      .catch(() => []),
    getSettings().catch(() => ({}))
  ]);

  return (
    <>
      <TopBar />
      <Header />

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">Buyer Guides</div>
            <h1>Clock sourcing guides</h1>
            <p className="sec-sub">
              Practical answers to the questions buyers ask before placing a first order —
              MOQ, certification, lead time and how to tell a real factory from a trading company.
            </p>
          </div>
        </div>

        <section>
          <div className="wrap">
            {posts.length === 0 ? (
              <p style={{ color: 'var(--ink3)' }}>Guides are being written. Send us your question instead.</p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {posts.map((p) => (
                  <Link key={p.id} href={`/blog/${p.slug}/`}
                    style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '22px 24px', background: '#fff', transition: '.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}>
                    <h3 style={{ fontSize: 19, marginBottom: 8 }}>{p.title}</h3>
                    {p.excerpt && (
                      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 10 }}>{p.excerpt}</p>
                    )}
                    <span style={{ fontSize: 12.5, color: 'var(--brand)' }}>
                      {p.published_at?.slice(0, 10)} →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
