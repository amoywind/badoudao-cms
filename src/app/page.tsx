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
              <img src="/hero-clocks.jpg" alt="Quartz wall clocks we manufacture: pendulum, wood, metal, resin and novelty designs" width={1400} height={788} />
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
              <h2>Wall clocks, alarm clocks and movements — factory direct</h2>
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
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        loading="lazy"
                        width={600}
                        height={600}
                      />
                    )}
                  </div>
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
                  ['Assembly & movement sourcing', 'Japan, Taiwan and China movements — you choose the accuracy-to-cost point.'],
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
                <span className="cert">CE (movement)</span>
                <span className="cert">RoHS (movement)</span>
                <span className="cert">QC: IQC / IPQC / FQC / OQC</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 14, lineHeight: 1.6 }}>
                Quartz clocks themselves carry no mandatory certification requirement.{' '}
                <Link href="/p/certification" style={{ textDecoration: 'underline' }}>Read the full compliance note</Link>
              </p>
            </div>
            <div className="hero-img">
              <img src="/workshop-floor.jpg" alt="Our assembly floor: staff fitting dials and movements before packing" width={1400} height={933} />
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
