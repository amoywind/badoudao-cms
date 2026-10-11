import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getProduct, listProducts, getSettings } from '@/lib/db';
import { TopBar, Header, Footer } from '../../../SiteChrome';
import { InquiryForm } from '../../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { category, slug } = params;
  const product = await getProduct(slug, { includeDrafts: false }).catch(() => null);

  if (!product || product.category !== category) notFound();

  const [related, s] = await Promise.all([
    listProducts({ category, status: 'published' }).catch(() => []),
    getSettings().catch(() => ({} as SiteSettings))
  ]);
  const others = related.filter((p) => p.id !== product.id).slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id,
    description: product.summary,
    image: product.images[0]?.url,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'USD',
      url: `${s.siteUrl}/products/${category}/${product.slug}/`
    }
  };

  const mainImg = product.images[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/products/">Products</Link><span>/</span>
          <Link href={`/products/${category}/`}>{category}</Link><span>/</span>
          <span>{product.name}</span>
        </div>
      </nav>

      <main>
        <section>
          <div className="wrap">
            <div className="pd">
              <div className="pd-gallery">
                <div className="main">
                  {mainImg
                    ? <img src={mainImg.url} alt={product.name} width={1200} height={900} />
                    : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink3)' }}>No image</div>}
                </div>
              </div>

              <div className="pd-info">
                <h1>{product.name}</h1>
                <p style={{ fontSize: 16, color: 'var(--ink2)' }}>{product.summary}</p>

                <div className="pd-price">
                  <span className="amt">${product.priceMin.toFixed(2)}–${product.priceMax.toFixed(2)}</span>
                  <span className="lbl">Ex Works (factory price)<br />per piece, before freight</span>
                </div>

                <dl className="pd-facts">
                  <div className="pd-fact"><dt>Model / SKU</dt><dd>{product.id}</dd></div>
                  <div className="pd-fact"><dt>Minimum order</dt><dd>{product.moq} pcs</dd></div>
                  <div className="pd-fact"><dt>Lead time</dt><dd>{product.leadTime}</dd></div>
                  <div className="pd-fact"><dt>Sample time</dt><dd>{s.sampleDays || '7-10'} days</dd></div>
                  {product.moveLevel && <div className="pd-fact"><dt>Movement</dt><dd>{product.moveLevel}</dd></div>}
                </dl>

                <div className="cta-panel" style={{ marginBottom: 26 }}>
                  <h3>Request pricing for {product.id}</h3>
                  <p>Tell us your quantity and whether you need custom artwork. We reply within {s.quoteHours || 12} hours.</p>
                  <a href="#inquiry" className="btn btn-primary" style={{ width: '100%' }}>Get a Quote for this Model</a>
                </div>

                {product.options.length > 0 && (
                  <>
                    <h3 style={{ fontFamily: 'var(--sans)', fontSize: 16, marginBottom: 10 }}>Customisation available</h3>
                    <div className="chip-list" style={{ marginBottom: 26 }}>
                      {product.options.map((o) => (
                        <span key={o.id} className="badge badge-brand">
                          {o.label}{o.priceDelta > 0 ? ` (+$${o.priceDelta.toFixed(2)})` : ''}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {product.specs.length > 0 && (
          <section className="alt">
            <div className="wrap split">
              <div>
                <div className="sec-tag">Specifications</div>
                <h2 style={{ fontSize: 28 }}>Technical detail</h2>
                <table className="spec-table" style={{ marginTop: 20 }}>
                  <tbody>
                    {product.specs.map((sp) => (
                      <tr key={sp.id}><th scope="row">{sp.label}</th><td>{sp.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {product.content && (
                <div>
                  <div className="sec-tag">Product description</div>
                  <div className="content-block" dangerouslySetInnerHTML={{ __html: product.content }} />
                </div>
              )}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <div className="wrap">
              <div className="sec-head">
                <div className="sec-tag">Related</div>
                <h2 style={{ fontSize: 30 }}>Other models in production</h2>
              </div>
              <div className="related-grid">
                {others.map((p) => (
                  <Link key={p.id} href={`/products/${p.category}/${p.slug}/`} className="card">
                    <div className="c-visual">
                      {p.images.length ? <img src={p.images[0].url} alt={p.name} /> : null}
                    </div>
                    <div className="c-body">
                      <h3 style={{ fontSize: 16 }}>{p.name}</h3>
                      <div className="c-meta"><span>MOQ <b>{p.moq}</b></span><span className="exw">EXW ${p.priceMin.toFixed(2)}</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="inquiry" style={{ background: 'var(--bg2)' }}>
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 32 }}>Get pricing for {product.id}</h2>
                <p className="sec-sub">Quantity, customisation and delivery expectations — send them over.</p>
              </div>
              <InquiryForm products={others.length ? others : [product]} preset={product.name} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
