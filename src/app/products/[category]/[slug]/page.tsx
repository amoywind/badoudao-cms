import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getProduct, listProducts, getSettings, listProductVideos, buildMeta, SITE_URL } from '@/lib/db';
import { TopBar, Header, Footer } from '../../../SiteChrome';
import { InquiryForm } from '../../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Per-product metadata. The admin's seo_title / seo_description win when
 * set; otherwise both are built from the price band and MOQ, which is what
 * a buyer searches on and what earns the rich result.
 */
export async function generateMetadata({ params }) {
  const { category, slug } = params;
  const log: string[] = [];
  try {
    log.push("start");
    const product: any = await getProduct(slug, { includeDrafts: false }).catch((e) => ({ err: e.message }));
    log.push(`product=${!!product}`);
    const moq = product?.moq || 500;
    log.push(`moq=${moq} pmin=${typeof product?.priceMin} pmax=${typeof product?.priceMax}`);
    const desc = `${product?.name} — ${product?.summary || ""} MOQ ${moq} pcs.`;
    log.push("desc-ok");
    const m: any = buildMeta({
      title: `${product?.name} | Test`,
      description: desc,
      seoTitle: product?.seoTitle,
      seoDescription: product?.seoDescription,
      keywords: product?.metaKeywords,
      path: `/products/${category}/${product?.slug}`,
      image: product?.images?.[0]?.url,
      type: 'product'
    });
    log.push(`buildMeta-ok title=${m?.title ? "yes" : "EMPTY"}`);
    return { title: `OK [${log.join(" | ")}]`, description: "d" };
  } catch (err: any) {
    return { title: `ERR [${log.join(" | ")}] >> ${err?.message}`, description: "d" };
  }
}

export default async function ProductPage({ params }) {
  const { category, slug } = params;
  const product = await getProduct(slug, { includeDrafts: false }).catch(() => null);

  if (!product || product.category !== category) notFound();

  const [related, s, videos] = await Promise.all([
    listProducts({ category, status: 'published' }).catch(() => []),
    getSettings().catch(() => ({} as SiteSettings)),
    listProductVideos(product.id).catch(() => [])
  ]);
  const others = related.filter((p) => p.id !== product.id).slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id,
    description: product.summary,
    image: product.images[0]?.url,
    brand: { '@type': 'Brand', name: 'Badoudao' },
    manufacturer: { '@type': 'Organization', name: 'Badoudao' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: product.priceMin,
      highPrice: product.priceMax,
      offerCount: Math.max(1, product.prices.length),
      availability: 'https://schema.org/InStock',
      url: `${s.siteUrl}/products/${category}/${product.slug}/`,
      seller: { '@type': 'Organization', name: 'Badoudao' }
    }
  };

  /* Video earns a rich result on its own, but only when the surrounding
     page stays indexable — a noindex page forfeits the eligibility. */
  const videoSchema = videos.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: videos[0].title || `${product.name} — product video`,
        description: product.summary,
        thumbnailUrl: [`https://i.ytimg.com/vi/${videos[0].youtubeId}/maxresdefault.jpg`],
        embedUrl: `https://www.youtube.com/embed/${videos[0].youtubeId}`,
        contentUrl: `https://www.youtube.com/watch?v=${videos[0].youtubeId}`,
        uploadDate: new Date().toISOString().slice(0, 10)
      }
    : null;

  const mainImg = product.images[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      {videoSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />
      )}
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/products">Products</Link><span>/</span>
          <Link href={`/products/${category}`}>{category}</Link><span>/</span>
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
                    ? <img src={mainImg.url} alt={mainImg.alt || product.name}
                        width={1200} height={1200} />
                    : <div className="pd-noimg">
                        <span>No product image yet</span>
                        <a href="#inquiry">Ask us for photos →</a>
                      </div>}
                </div>

                {videos.length > 0 && (
                  <div className="pd-videos">
                    {videos.map((v) => (
                      <a key={v.id} className="pd-video"
                        href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                        target="_blank" rel="noopener noreferrer"
                        aria-label={`Play video: ${v.title || product.name}`}>
                        <img
                          src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                          alt={v.title || `${product.name} video thumbnail`}
                          width={480} height={360} loading="lazy" />
                        <span className="pd-video-play" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                        <span className="pd-video-t">
                          {v.title || 'Product video'}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
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
                <ul className="tick-list" style={{ marginTop: 22 }}>
                  <li>Ex Works price breaks by quantity tier</li>
                  <li>Custom dial artwork and logo printing available</li>
                  <li>Attach a drawing or reference image if you have one</li>
                </ul>
              </div>
              {/* The only other page that keeps a form: a buyer who opened
                  this specific model has already chosen, so asking here is
                  the least intrusive place to do it. */}
              <InquiryForm preset={product.name} compact />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
