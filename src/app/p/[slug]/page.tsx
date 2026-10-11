import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { notFound } from 'next/navigation';
import { one, getSettings, listCategories } from '@/lib/db';
import { TopBar, Header, Footer } from '../../SiteChrome';
import { InquiryForm } from '../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function StaticPage({ params }) {
  const page = await one(
    "SELECT * FROM pages WHERE id = ? AND status = 'published'",
    params.slug
  ).catch(() => null);

  if (!page) notFound();

  const [s, cats] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings)),
    listCategories().catch(() => [])
  ]);

  return (
    <>
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <span>{page.heading || page.title}</span>
        </div>
      </nav>

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">{page.title}</div>
            <h1>{page.heading || page.title}</h1>
            {page.intro && <p className="sec-sub">{page.intro}</p>}
          </div>
        </div>

        <section>
          <div className="wrap">
            <div className="content-block" dangerouslySetInnerHTML={{ __html: page.body }} />
          </div>
        </section>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 30 }}>Ready to talk numbers?</h2>
                <p className="sec-sub">
                  Send your requirement. We reply within {s.quoteHours || 12} hours
                  with a breakdown of tooling, unit price, packaging and freight.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
                  {cats.map((c) => (
                    <Link key={c.id} href={`/products/${c.id}/`} className="badge badge-brand">
                      {c.short || c.name}
                    </Link>
                  ))}
                </div>
              </div>
              <InquiryForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
