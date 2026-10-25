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
      `Browse ${products.length} quartz clock models from Badoudao: wall, alarm, desk, wood and metal clocks plus clock movements. MOQ from ${s.moq || 300} pcs, Ex Works factory pricing, custom dial artwork and logo printing available.`,
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
    <div className="site">

      <TopBar />
      <Header />

      <main>
        {/* The page header and the eight category cards that used to sit
            here are gone.

            The header repeated what the nav and the sidebar already say,
            with a slogan in place of information: "Product Catalogue" over
            "Quartz clocks, wholesale" over a paragraph about Ex Works that
            appears on every model card below.

            The cards were the real problem. Eight of them, each a large
            gradient panel with no photograph — because no category has a
            category image yet. So the first screen was eight identical
            grey rectangles. A buyer cannot judge a category from its
            description and a number, and the sidebar below does the same
            job in a form that fits in one column and works on a phone.

            What remains is the grid, with the category rail beside it. */}
        <section>
          <div className="wrap">
            <div className="shop-layout">
              <CategoryNav cats={cats} counts={counts} heading="Browse by Category" />

              <div>
                <div className="sec-head">
                  <div className="sec-tag">All Models</div>
                  <h1 style={{ fontSize: 30 }}>{products.length} models in production</h1>
                </div>

                <div className="grid-3">
                  {products.map((p, i) => (
                    <Link key={p.id} href={`/products/${p.category}/${p.slug}/`} className="card">
                      <div className="c-visual">
                        {p.images.length ? (
                          <img
                            src={p.images[0].thumbUrl || p.images[0].url}
                            alt={p.name}
                            decoding="async"
                            {...(i === 0 ? { fetchpriority: 'high' } : { loading: 'lazy' })}
                          />
                        ) : null}
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
        </div>

  );
}
