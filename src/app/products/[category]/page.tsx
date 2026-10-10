import Link from 'next/link';
import { listProducts, listCategories, getSettings } from '@/lib/db';
import { TopBar, Header, Footer } from '../../SiteChrome';
import { InquiryForm } from '../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
  const { category } = params;
  const cats = await listCategories().catch(() => []);
  const cat = cats.find((c) => c.id === category);
  const [products, s] = await Promise.all([
    listProducts({ category, status: 'published' }).catch(() => []),
    getSettings().catch(() => ({}))
  ]);

  const title = cat ? `${cat.name} — wholesale & OEM manufacturer` : 'Products';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat ? `${cat.name} wholesale` : 'Products',
    description: cat?.description,
    hasPart: products.map((p) => ({ '@type': 'Product', name: p.name, sku: p.id }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/products/">Products</Link><span>/</span>
          <span>{cat?.short || category}</span>
        </div>
      </nav>

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">{cat?.short} · Wholesale &amp; OEM</div>
            <h1>{title}</h1>
            <p className="sec-sub">
              Looking for a {(cat?.short || category).toLowerCase()} supplier? Badoudao manufactures in-house
              with MOQ from {s.moq || 500} pieces, custom dial artwork and retail-ready packaging.
              Ex Works pricing shown — freight and duties quoted separately.
            </p>
          </div>
        </div>

        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">Available Models</div>
              <h2 style={{ fontSize: 30 }}>{products.length} {products.length === 1 ? 'model' : 'models'} in production</h2>
              <p className="sec-sub">Prices are per piece Ex Works. Larger orders step down.</p>
            </div>

            {products.length === 0 ? (
              <p style={{ color: 'var(--ink3)' }}>
                Models in this category are being added.{' '}
                <a href="#inquiry" style={{ color: 'var(--brand)' }}>Send us your requirement</a> and we will quote.
              </p>
            ) : (
              <div className="grid-3">
                {products.map((p) => (
                  <Link key={p.id} href={`/products/${category}/${p.slug}/`} className="card">
                    <div className="c-visual">
                      {p.images.length ? <img src={p.images[0].url} alt={p.name} /> : null}
                    </div>
                    <div className="c-body">
                      <h3 style={{ fontSize: 18 }}>{p.name}</h3>
                      <p style={{ fontSize: 13.5 }}>{p.summary?.slice(0, 130)}…</p>
                      <div className="c-meta">
                        <span>MOQ <b>{p.moq}</b> · {p.leadTime}</span>
                        <span className="exw">EXW ${p.priceMin.toFixed(2)}–{p.priceMax.toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 32 }}>Tell us what you need</h2>
                <p className="sec-sub">Send a reference photo or a sample. Quotation within {s.quoteHours || 12} hours.</p>
              </div>
              <InquiryForm products={products.slice(0, 9)} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
