import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getProduct, listProducts, getSettings, listProductVideos, buildMeta } from '@/lib/db';
import { OPTION_GROUPS, QC_CLAIMS, PACKAGING_OPTIONS, PROCESS_STEPS, FAQS, seoTagsFor } from '@/lib/product-detail';
import { ProductGallery, CustomisationPicker } from '../../_pd-client';
import { TopBar, Header, Footer } from '../../../SiteChrome';
import { InquiryForm } from '../../../InquiryForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Per-product metadata.
 *
 * The admin's seo_title / seo_description win when set; otherwise both are
 * built from the price band and MOQ, which is what a buyer searches on.
 *
 * No `type` is passed: og:type has no "product" member, and supplying one
 * made Next discard this whole object — the page rendered with no <title>
 * and no description at all. The Product JSON-LD further down is what marks
 * this as a product to a search engine.
 */
export async function generateMetadata({ params }) {
  const { category, slug } = params;

  try {
    const product = await getProduct(slug, { includeDrafts: false }).catch(() => null);

    if (!product || product.category !== category) {
      return { title: 'Product | Badoudao', robots: { index: false } };
    }

    const moq = product.moq || 500;
    const price = product.priceMin
      ? ` EXW $${product.priceMin.toFixed(2)}–$${product.priceMax.toFixed(2)}.`
      : '';

    return buildMeta({
      title: `${product.name} | OEM Quartz Clock Manufacturer | Badoudao`,
      description:
        `${product.name} — ${product.summary || ''} MOQ ${moq} pcs.${price}` +
        ` ${product.leadTime || '20-30 days'} lead time, custom dial artwork available.`,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      keywords: product.metaKeywords,
      path: `/products/${category}/${product.slug}`,
      image: product.images[0]?.url
    });
  } catch (err) {
    /* Contained on purpose: a throw here leaves the page rendering with no
       title at all, and nothing in the front end reveals it. */
    console.error('generateMetadata failed:', (err as Error)?.message);
    return {
      title: `${slug} | Badoudao Quartz Clocks`,
      description:
        'OEM and ODM quartz clocks from Badoudao. MOQ from 500 pieces, Ex Works pricing.'
    };
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

  /* The gallery wants every shot with its angle noted, ordered so the
     front-on view leads. product.images is already sort-ordered; the kind
     is carried through because the thumbnail needs to say whether it is
     showing the back or the movement. */
  const shots = product.images.map((im) => ({
    url: im.url,
    alt: im.alt || product.name,
    kind: im.kind || ''
  }));

  const tags = seoTagsFor({
    category,
    specs: product.specs,
    moveLevel: product.moveLevel
  });

  const moq = product.moq || s.moq || 500;

  /* Wrapped in .site so the responsive layer's bare-element selectors —
     h1, section, table — apply here and not in the admin, which shares the
     root layout and therefore this stylesheet. The admin's own layout
     carries .admin-root instead; see app/layout.tsx. */
  return (
    <div className="site">
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
              {/* Gallery left, decision column right.

                  The right column is the argument: what it is, who can make
                  it, what it costs, how to start. The MOQ gets its own card
                  rather than a row in the facts table, because "500 pieces
                  minimum" is the number that decides whether a buyer keeps
                  reading or closes the tab — it is not one fact among six. */}
              <ProductGallery name={product.name} images={shots} />

              <div className="pd-info">
                <div className="pd-badges">
                  <span className="pd-badge pd-badge-brand">OEM / ODM Available</span>
                  <span className="pd-badge">Factory Direct</span>
                </div>

                <h1>{product.name}</h1>
                <p className="pd-lede">{product.summary}</p>

                <div className="pd-price">
                  <span className="amt">${product.priceMin.toFixed(2)}–${product.priceMax.toFixed(2)}</span>
                  <span className="lbl">Ex Works (factory price)<br />per piece, before freight</span>
                </div>

                {/* The MOQ as a standalone card. A buyer deciding whether
                    this factory is viable needs it before anything else, and
                    in a facts list it reads as one of several parameters
                    rather than as a threshold. */}
                <a href="#inquiry" className="pd-moq">
                  <span className="pd-moq-l">Minimum order quantity</span>
                  <span className="pd-moq-v">{moq} pcs</span>
                  <span className="pd-moq-n">Mixed designs welcome if the total meets it</span>
                </a>

                {tags.length > 0 && (
                  <div className="pd-tags">
                    <h3>Material &amp; craftsmanship</h3>
                    <div className="pd-taglist">
                      {tags.map((t) => (
                        <Link key={t.label} href={t.href} className="pd-tag">{t.label}</Link>
                      ))}
                    </div>
                  </div>
                )}

                <CustomisationPicker groups={OPTION_GROUPS} moq={moq} />

                <dl className="pd-facts">
                  <div className="pd-fact"><dt>Model / SKU</dt><dd>{product.id}</dd></div>
                  <div className="pd-fact"><dt>Lead time</dt><dd>{product.leadTime}</dd></div>
                  <div className="pd-fact"><dt>Sample time</dt><dd>{s.sampleDays || '7-10'} days</dd></div>
                  {product.moveLevel && <div className="pd-fact"><dt>Movement</dt><dd>{product.moveLevel}</dd></div>}
                </dl>

                {/* QC claims as links: each one is a claim a buyer can check
                    us on, so each goes to the page that substantiates it
                    rather than standing here as an adjective. */}
                <div className="pd-qc">
                  {QC_CLAIMS.map((q) => (
                    <Link key={q.label} href={q.href} className="pd-qc-i" title={q.note}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <b>{q.label}</b>
                      <span>{q.note}</span>
                    </Link>
                  ))}
                </div>

                <a href="#inquiry" className="btn btn-primary pd-cta">
                  Get Factory Quote / Send Inquiry
                </a>
                <p className="pd-cta-note">
                  Reply within {s.quoteHours || 12} hours · No obligation · Ex Works
                </p>
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

        {/* Packaging, as four choices with what each is for rather than four
            pictures of boxes. A buyer choosing packaging is choosing a unit
            cost and a sales channel: closed box for containers, display box
            for shelves. Saying so is more use than showing a carton. */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-tag">Packaging</div>
            <h2 style={{ fontSize: 30 }}>Four standard packaging options</h2>
            <p className="sec-sub" style={{ marginBottom: 34 }}>
              Every model can ship in any of these. Custom structure and print
              are available on the colour box, with tooling cost quoted before
              you commit.
            </p>

            <div className="pd-pack">
              {PACKAGING_OPTIONS.map((p) => (
                <div key={p.key} className="pd-pack-c">
                  {/* Placeholder until a packaging photo is uploaded. A
                      drawn box outline reads as intentional; an empty grey
                      square reads as a broken image. */}
                  <div className="pd-pack-img" aria-hidden="true">
                    <svg viewBox="0 0 64 48" fill="none" stroke="currentColor"
                      strokeWidth="1.6" strokeLinejoin="round">
                      <path d="M32 6l24 10v22L32 48 8 38V16z" />
                      <path d="M8 16l24 10 24-10M32 26v22" />
                    </svg>
                    <span>Photo pending</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.note}</p>
                  <span className="pd-pack-fit">{p.fit}</span>
                </div>
              ))}
            </div>

            {/* The four OEM/ODM steps, horizontally. Each states what we do
                and what comes back, so a buyer can see where their own
                input is needed — step one is the only place a quote starts. */}
            <div className="pd-process">
              <h2 className="pd-process-h">How an OEM order runs</h2>
              <ol>
                {PROCESS_STEPS.map((st) => (
                  <li key={st.n}>
                    <span className="pd-process-n" aria-hidden="true">{st.n}</span>
                    <h3>{st.title}</h3>
                    <p>{st.note}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* The questions that decide whether to enquire at all. Four, no
            more: past that it stops being scannable and starts being a
            document. */}
        <section>
          <div className="wrap">
            <div className="sec-tag">Before you order</div>
            <h2 style={{ fontSize: 30 }}>Common questions</h2>

            <div className="pd-faq">
              {FAQS.map((f) => (
                <details key={f.q} className="pd-faq-i">
                  <summary>
                    {f.q}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

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
              {/* A crash in the enquiry form must not cost the buyer the
                  specifications they came for — it is the one interactive
                  part of this page. */}
              <ErrorBoundary label="product-enquiry" backHref="/contact">
                <InquiryForm preset={product.name} compact />
              </ErrorBoundary>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
    </div>
  );
}
