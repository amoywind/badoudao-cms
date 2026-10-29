import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { listProducts, listCategories, getSettings, countProductsByCategory, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { CategoryNav } from '../CategoryNav';
import { InquiryCTA } from '../InquiryForm';
import { ProductFilter } from '../ProductFilter';
import { MATERIALS } from '@/lib/vocabulary';

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

                {/* The catalogue, with the material filter above it.

                    This page had a card of its own and the category
                    pages had another, and the same catalogue read at two
                    different sizes depending on which page a buyer had
                    arrived at. One card, one grid — the picture is the
                    size the category pages draw it, and the price is
                    written the same way.

                    The filter narrows by material because that is the
                    axis the catalogue is organised on and every product
                    has one. It does not narrow by movement: only some
                    of the products carry a movement recorded, and a
                    filter that quietly hides half the catalogue when a
                    buyer picks an option is worse than no filter. */}
                <ProductFilter
                  products={products.map((p) => ({
                    id: p.id,
                    slug: p.slug,
                    name: p.name,
                    category: p.category,
                    summary: p.summary || '',
                    priceMin: p.priceMin,
                    priceMax: p.priceMax,
                    moq: p.moq,
                    leadTime: p.leadTime,
                    image: p.images.length ? p.images[0].thumbUrl || p.images[0].url : ''
                  }))}
                  materials={MATERIALS.map((m) => ({
                    id: m.slug,
                    name: m.name,
                    count: counts[m.slug] || 0
                  }))}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---- Raw material tolerances ----

            The figure each material is held to. A buyer comparing two
            quotes is usually comparing two materials, and this is the
            number that tells them whether the cheaper one is cheaper
            because it is a different material or because it is a
            worse one.

            It sits here, under the catalogue, because it is about the
            goods in the grid above — not a page in its own right. */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Raw material tolerances</div>
              <h2>What each material is held to</h2>
              <p className="sec-sub">
                These are the measurements the factory checks on the raw
                material before it is cut. Ask for the QC report on your
                order and it comes with the batch it belongs to.
              </p>
            </div>

            <div className="tol-grid">
              {MATERIALS.map((m) => (
                <Link key={m.slug} href={`/products/${m.slug}`} className="tol-card">
                  <span className="tol-name">{m.name}</span>
                  <span className="tol-spec tnum">{m.tolerance}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 30 }}>Tell us what you need</h2>
                <p className="sec-sub">Quotation within {s.quoteHours || 4} hours.</p>
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
