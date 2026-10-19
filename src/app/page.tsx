import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { listCategories, getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from './SiteChrome';
import { InquiryCTA } from './InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Home page metadata.
 *
 * Carries the numbers a buyer filters on — MOQ, capacity, response time,
 * price basis — because those are the terms the query contains, and a
 * description that restates them is what earns the click.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Quartz Clock Manufacturer China — OEM & ODM Wholesale | Badoudao',
    description:
      `OEM and ODM quartz clocks from a China factory. Wall clocks, alarm clocks, desk clocks and clock movements. MOQ from ${s.moq || 500} pcs, ${s.capacityMin || 2000} pcs daily capacity, Ex Works pricing, CE and RoHS movements. Quotation within ${s.quoteHours || 12} hours.`,
    keywords:
      'quartz clock manufacturer, OEM clock factory, wholesale wall clocks, China clock supplier, custom quartz clocks',
    path: '/',
    image: '/hero-clocks.jpg'
  });
}

export default async function HomePage() {
  const [cats, s] = await Promise.all([
    listCategories().catch(() => []),
    getSettings().catch(() => ({} as SiteSettings))
  ]);

  /* No product grid on the home page.

     It was there, and it was wrong for this buyer. A wall of six clocks
     with EXW prices tells a wholesale buyer who already knows what they
     want to see, and tells everyone else nothing they can act on: they
     cannot tell a 40-piece aluminium movement from a 60-piece brass one
     from a photograph, and picking a product is a conversation, not a
     click. The categories below carry the same information in a form a
     buyer can use to navigate, and the enquiry form is one scroll away. */

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s.siteName || 'Badoudao',
    url: s.siteUrl || '',
    email: s.email,
    telephone: s.phone,
    address: { '@type': 'PostalAddress', addressLocality: s.address, addressCountry: 'CN' }
  };

  return (
    <div className="site">

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TopBar />
      <Header />

      <main id="main">
        <section className="hero">
          <div className="wrap">
            <div>
              <div className="eyebrow"><span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--brand)' }} />Quartz Clock Manufacturer · Small-Batch OEM</div>
              <h1>Custom quartz clocks, built for <em>your brand</em></h1>
              <p className="lede">Wall clocks, alarm clocks and table clocks in OEM and ODM form. MOQ from {s.moq || 500} pieces, custom dial artwork and packaging, and a quote back within {s.quoteHours || 12} hours.</p>
              <div className="hero-btns">
                <a href="#inquiry" className="btn btn-primary">Request a Quote</a>
                <Link href="/products" className="btn btn-ghost">View Products</Link>
              </div>
              <p className="hero-note">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f5c4a" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg>
                Movements are CE and RoHS compliant · Certification arranged on request
              </p>
            </div>
            <div className="hero-img">
              {/* fetchpriority="high" because this is the largest
                  contentful paint element: the browser was otherwise free to
                  treat it as one more image in the queue and start it after
                  the stylesheet, the runtime and the fold. decoding="async"
                  moves the JPEG decode off the main thread, which is the
                  difference between the text appearing immediately and
                  waiting 30ms behind an image nobody has looked at yet.

                  Spread rather than written inline: React 18 does not know
                  this attribute and passes unknown props through with their
                  case intact, so fetchPriority renders as fetchPriority —
                  not the HTML attribute, and a warning on every render.
                  fetchpriority is what the parser reads. The spread keeps
                  it out of JSX's typed attribute list, where only the
                  camelCase spelling exists and is wrong at runtime. React
                  19 ships the lowercase form and this can go back to a
                  plain prop.

                  No loading="lazy" here — it is the one image on the page
                  that is above the fold, and lazy would defer it. */}
              <img
                src="/hero-clocks.jpg"
                alt="Quartz wall clocks we manufacture: pendulum, wood, metal, resin and novelty designs"
                width={1400}
                height={788}
                /* 134 KB at 1400px, shown in a 358px frame on a phone. The
                   720px copy is 27 KB and still sharper than the screen it
                   is read on; the desktop layout spans most of the viewport
                   and keeps the original. Same reasoning as the product
                   thumbnails, for the two photos that live in public/
                   rather than in the media library. */
                srcSet="/hero-clocks-720.jpg 720w, /hero-clocks.jpg 1400w"
                sizes="(max-width: 680px) 92vw, 78vw"
                {...{ fetchpriority: 'high' }}
                decoding="async"
              />
            </div>
          </div>
        </section>

        <div className="trust">
          <div className="wrap trust-grid">
            <div className="trust-item">
              <div className="trust-num">
                {String(s.capacityMin) === String(s.capacityMax)
                  ? s.capacityMin
                  : `${s.capacityMin}-${s.capacityMax}`}
                <small>pcs</small>
              </div>
              <div className="trust-lab">Daily Capacity</div>
            </div>
            <div className="trust-item">
              <div className="trust-num"><small>{s.quoteHours || 12}</small>h</div>
              <div className="trust-lab">Quote Response</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">20<small>&ndash;45</small>d</div>
              <div className="trust-lab">Lead Time</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">7<small>&ndash;10</small>d</div>
              <div className="trust-lab">Sample Time</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">{s.moq || 500}<small>pcs</small></div>
              <div className="trust-lab">Starting MOQ</div>
            </div>
          </div>
        </div>

        <section id="categories">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">Product Range</div>
              <h2>Wall clocks in plastic, wood, metal, acrylic, glass and resin — factory direct</h2>
              <p className="sec-sub">All categories available with custom dials, logos, hands and packaging. Prices shown are <strong>Ex Works (factory) prices</strong> at MOQ {s.moq || 500} — freight and duties quoted separately.</p>
            </div>
            <div className="grid-3">
              {cats.map((c) => (
                <Link key={c.id} href={`/products/${c.id}`} className="card">
                  {/* The category's newest product with a photo. Six grey
                      gradients in a row read as a page that has not loaded;
                      the pictures are what let a buyer recognise a clock
                      shape before clicking. Falls back to the gradient when
                      nothing in the category has an image yet. */}
                  <div
                    className={`c-visual${c.imageUrl ? ' has-img' : ''}`}
                    style={c.imageUrl
                      ? { background: '#f4f5f7' }
                      : { background: 'linear-gradient(135deg,#f4f5f7,#e9eeec)' }}
                  >
                    {c.imageUrl && (
                      /* imageThumbUrl is a 640px copy of the same photo; the
                         original is 2048px and 954 KB. Six cards rendered the
                         originals carried 2.2 MB on mobile, 88% of it pixels
                         the 400px card never shows. The full-size file stays
                         one click away on the category page. */
                      <img
                        src={c.imageThumbUrl || c.imageUrl}
                        alt={c.name}
                        loading="lazy"
                        decoding="async"
                        width={600}
                        height={600}
                      />
                    )}
                  </div>
                  <div className="c-body">
                    <h3>{c.name}</h3>
                    {/* No description here. It is the category's own page
                        copy — a headline and three paragraphs written for
                        someone already decided on that category — and on a
                        card it became nine dense lines competing with the
                        picture, ending mid-sentence because the equal-height
                        row ran out of space. The card answers "what is it,
                        how many, what does it cost"; the link answers
                        everything else. */}
                    <div className="c-meta">
                      <span><b>{c.designs}</b> designs</span>
                      <span className="exw">EXW {c.price_range}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="alt" id="capability">
          <div className="wrap split">
            <div>
              <div className="sec-tag">Manufacturing</div>
              <h2>Everything happens under one roof</h2>
              <p className="sec-sub">From moulding to finished box. Keeping the whole process in-house means faster sampling, tighter tolerances and no surprises between you and the factory.</p>
              <div className="cap-list">
                {[
                  ['Tooling & in-house moulding', 'New tooling in 15–25 days, no subcontractor margin.'],
                  ['Surface finishing', 'UV spray, electroplating, brushed and antique brass effects, hand-painting.'],
                  ['Assembly & movement sourcing', 'Domestic and imported movements — you choose the accuracy-to-cost point.'],
                  ['Four-stage QC', 'IQC, IPQC, FQC and OQC. Every carton checked before it leaves.'],
                  ['Retail-ready packaging', 'Colour boxes, window boxes and gift sets designed to survive ocean freight.']
                ].map(([h, p], i) => (
                  <div className="cap" key={h}>
                    <div className="cap-n">0{i + 1}</div>
                    <div><h4>{h}</h4><p>{p}</p></div>
                  </div>
                ))}
              </div>
              <div className="certs">
                <span className="cert">CE &amp; RoHS movements</span>
                <span className="cert">QC: IQC / IPQC / FQC / OQC</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 14, lineHeight: 1.6 }}>
                Quartz clocks themselves carry no mandatory certification requirement.{' '}
                <Link href="/p/certification" style={{ textDecoration: 'underline' }}>Read the full compliance note</Link>
              </p>
            </div>
            <div className="hero-img">
              {/* 211 KB, well below the fold on every viewport measured.
                  Left eager it competed with the hero for bandwidth on a
                  phone; lazy lets the hero finish first. No fetchpriority —
                  that would put it back in the queue it was just removed
                  from. */}
              <img
                src="/workshop-floor.jpg"
                alt="Our assembly floor: staff fitting dials and movements before packing"
                width={1400}
                height={933}
                /* 206 KB for a photo that renders into half the viewport on
                   desktop and a 358px frame on a phone. The 720px copy is
                   44 KB. */
                srcSet="/workshop-floor-720.jpg 720w, /workshop-floor.jpg 1400w"
                sizes="(max-width: 900px) 92vw, 46vw"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        <section id="process">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">OEM / ODM Process</div>
              <h2>From your idea to a shipped container</h2>
            </div>
            <div className="proc">
              {[
                ['Send your brief', 'A reference photo, a sample or a sketch is enough to start.'],
                ['Quotation', `Within ${s.quoteHours || 12} hours with pricing broken down by tooling, unit, packaging and freight.`],
                ['Sample', `${s.sampleDays || '7-10'} days. Sample cost is credited against your first bulk order.`],
                ['Bulk production', '20–45 days depending on complexity, with photo and video updates.'],
                ['Delivery', 'Ex Works by default. CIF or DDP available on request.']
              ].map(([h, p], i) => (
                <div className="proc-i" key={h}>
                  <span className="proc-n">STEP 0{i + 1}</span>
                  <h4>{h}</h4><p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Popular Models grid that used to sit here is gone. See the note
            on HomePage: a six-card product wall on the home page gives a
            wholesale buyer nothing they can act on and pushes the enquiry
            form a full screen further down. */}

        <section id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 32 }}>Tell us what you need built</h2>
                <p className="sec-sub">Send a reference photo, a sample or just a rough idea. You will get a quotation within {s.quoteHours || 12} hours — no obligation.</p>
                <div className="certs" style={{ marginTop: 32 }}>
                  <span className="cert">MOQ from {s.moq || 500} pcs</span>
                  <span className="cert">Samples in {s.sampleDays || '7-10'} days</span>
                  <span className="cert">Ex Works pricing</span>
                </div>
                {/* The homepage carries enough prompts already; a full form here
                    competes with the product grid. Send visitors to the
                    contact page instead. */}
                <div style={{ marginTop: 32 }}>
                  <a className="btn btn-primary" href="/contact">Send an enquiry →</a>
                </div>
              </div>
              <div className="sec-tag" style={{ marginBottom: 12 }}>What we need from you</div>
              <InquiryCTA label="Five fields is all it takes" />
              <ul className="tick-list">
                <li>Your name, business email and WhatsApp</li>
                <li>Estimated quantity — a range is fine</li>
                <li>A sentence on size, style and target price</li>
                <li>Optional: a drawing, photo or PDF to reference</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
        </div>

  );
}
