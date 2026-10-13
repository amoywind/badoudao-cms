import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { listProducts, listCategories, getSettings, countProductsByCategory, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { CategoryNav } from '../CategoryNav';
import { InquiryCTA } from '../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const [products, cats, s] = await Promise.all([
    listProducts({ status: 'published' }).catch(() => []),
    listCategories().catch(() => []),
    getSettings().catch(() => ({} as SiteSettings))
  ]);

  return buildMeta({
    title: 'Wholesale Quartz Clocks — OEM & ODM Catalogue | Badoudao',
    description:
      `Browse ${products.length} quartz clock models from Badoudao: wall, alarm, desk, wood and metal clocks plus clock movements. MOQ from ${s.moq || 500} pcs, Ex Works factory pricing, custom dial artwork and logo printing available.`,
    keywords:
      'wholesale quartz clocks, quartz clock catalogue, OEM clock models, clock movement supplier',
    path: '/products/'
  });
}

export default async function ProductsIndex() {
  const [products, cats, s, counts] = await Promise.all([
    listProducts({ status: 'published' }).catch(() => []),
    listCategories().catch(() => []),
    getSettings().catch(() => ({} as SiteSettings)),
    countProductsByCategory().catch(() => ({} as Record<string, number>))
  ]);

  return (
    <>
      <TopBar />
      <Header />

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">Product Catalogue</div>
            <h1>Quartz clocks, wholesale</h1>
            <p className="sec-sub">
              Every category is available in OEM and ODM form with custom dials, logos and retail packaging.
              All prices are Ex Works (factory) — freight and duties quoted separately.
            </p>
          </div>
        </div>

        <section>
          <div className="wrap">
            <div className="grid-3" style={{ marginBottom: 56 }}>
              {cats.map((c) => (
                <Link key={c.id} href={`/products/${c.id}/`} className="card">
                  <div className="c-visual" style={{ background: 'linear-gradient(135deg,#f4f5f7,#e9eeec)' }} />
                  <div className="c-body">
                    <h3>{c.name}</h3>
                    <p>{c.description}</p>
                    <div className="c-meta">
                      <span><b>{c.designs}</b> designs</span>
                      <span className="exw">EXW {c.price_range}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* The category cards above already cover browsing from zero.
                This grid is the flat "show me everything" case, and the
                sidebar is there so a buyer who has decided on a material
                can still narrow without scrolling back up. */}
            <div className="shop-layout">
              <CategoryNav cats={cats} counts={counts} heading="Browse by Category" />

              <div>
            <div className="sec-head">
              <div className="sec-tag">All Models</div>
              <h2 style={{ fontSize: 30 }}>{products.length} models in production</h2>
            </div>
            <div className="grid-3">
              {products.map((p) => (
                <Link key={p.id} href={`/products/${p.category}/${p.slug}/`} className="card">
                  <div className="c-visual">
                    {p.images.length ? <img src={p.images[0].url} alt={p.name} /> : null}
                  </div>
                  <div className="c-body">
                    <h3 style={{ fontSize: 17 }}>{p.name}</h3>
                    <p style={{ fontSize: 13.5 }}>{p.summary?.slice(0, 100)}…</p>
                    <div className="c-meta">
                      <span>MOQ <b>{p.moq}</b></span>
                      <span className="exw">EXW ${p.priceMin.toFixed(2)}–{p.priceMax.toFixed(2)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
              </div>
            </div>
          </div>
        </section>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 30 }}>Tell us what you need</h2>
                <p className="sec-sub">Quotation within {s.quoteHours || 12} hours.</p>
              </div>
              <InquiryCTA label="Send us your requirements" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
