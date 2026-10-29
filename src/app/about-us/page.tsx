import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { TrustCards, Icons } from '../TrustCards';
import { SiteSchema } from '../SiteSchema';
import { CERTIFICATIONS } from '@/lib/vocabulary';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * About the factory.
 *
 * The existing /p/factory page carries the long-form factory story, and
 * it stays where it is — this page is the short version a buyer reaches
 * from the navigation, and it links across to the long one rather than
 * replacing it.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'About the Factory — Wall Clock Manufacturer in Xiamen | Badoudao',
    description:
      `Xiamen Chengmaomao Creative Home Furnishings Co., Ltd. is a custom wall clock manufacturer in Xiamen, China. 10+ years in the trade, ${(Number(s.capacityMin) || 2000).toLocaleString('en-US')} pcs daily capacity, MOQ from ${s.moq || 300} pcs, 1,000+ hand styles, Ex Works pricing.`,
    keywords:
      'china wall clock manufacturer, xiamen clock factory, quartz clock OEM supplier, low MOQ wall clock supplier, small batch wall clock factory, custom wall clock manufacturer china',
    path: '/about-us'
  });
}

export default async function AboutUsPage() {
  const s = await getSettings().catch(() => ({} as SiteSettings));
  const moq = Number(s.moq) || 300;

  /* The daily capacity is stored as a bare number — "2000" — and the
     page writes it in two places. Written raw it reads "2000" next to
     the "2,000" printed on the trust card above, and two spellings of
     the same number on one page is the kind of thing a buyer notices.
     The separator goes on here rather than in the copy, so the number
     stays one number when the factory changes it. */
  const capacity = (Number(s.capacityMin) || 2000).toLocaleString('en-US');

  return (
    <div className="site">
      <SiteSchema s={s} />
      <TopBar />
      <Header />

      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="sec-tag">// About us</div>
            <h1>Precision engineering, flexible quantities</h1>
            <p>
              Xiamen Chengmaomao Creative Home Furnishings Co., Ltd. manufactures
              engineered custom wall clocks in Xiamen, China — design, tooling,
              production and export under one roof. We build for e-commerce brands,
              Amazon and Shopify sellers, and interior designers, with the tolerances
              of a large run and the minimum order of a small one.
            </p>
          </div>
        </section>

        <section>
          <div className="wrap">
            <TrustCards
              items={[
                { value: '10+', title: 'Years in the trade', detail: 'Wall clock manufacturing and export', icon: Icons.clock },
                { value: String(moq), unit: ' pcs', title: 'Flexible minimum order', detail: 'Mixed colours and specs in one order', icon: Icons.box },
                { value: '1,000+', title: 'Hand styles in stock', detail: 'Ready to use, no tooling needed', icon: Icons.ruler },
                { value: capacity, unit: ' pcs', title: 'Daily capacity', detail: 'Across one shift', icon: Icons.gear }
              ]}
            />
          </div>
        </section>

        {/* ---- Core capabilities ----
            The three things a buyer cannot get from a supplier who does not
            own the machines. Each one is a claim a buyer can check, so
            each carries its own number. */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Core capabilities</div>
              <h2>Three things a trading desk cannot give you</h2>
              <p className="sec-sub">
                A supplier who buys clocks and resells them can match a price. He
                cannot change the tooling, the packing or the test a clock passes
                before it leaves the building. These are the three that decide
                whether an order is worth placing.
              </p>
            </div>

            <div className="grid-3">
              {[
                {
                  icon: Icons.box,
                  title: 'Flexible MOQ from 300 pieces',
                  body:
                    'Most clock factories will not start a run below 2,000 pieces, which forces a brand to commit inventory before it has a single customer. Our modular line starts at 300, and you can mix styles and colours inside one order — so a seasonal launch or a market test does not have to be a bet on two thousand units.'
                },
                {
                  icon: Icons.ruler,
                  title: 'End-to-end customisation',
                  body:
                    'More than 1,000 hand styles — CNC brass, lightweight aluminium and solid timber — against dial materials from solid walnut and industrial ironwork through crystal porcelain to 3D-printed acrylics. Our engineering team sits in-house, so a drawing is checked against what the machine can actually make before it is quoted.'
                },
                {
                  icon: Icons.shield,
                  title: 'Built to survive the courier',
                  body:
                    'A broken clock arrives as a refund, a bad review and a second freight bill. Every clock is packed in custom-cut EPE pearl-cotton armour inside a mail-order-grade outer carton, and the packed carton is drop-tested from 1.2 metres on all six faces before it leaves the building.'
                }
              ].map((c) => (
                <div className="card" key={c.title} style={{ padding: 26 }}>
                  <div className="tcard-ico">{c.icon}</div>
                  <h3 style={{ fontSize: 16.5, marginBottom: 9 }}>{c.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- The company ---- */}
        <section>
          <div className="wrap split" style={{ alignItems: 'start' }}>
            <div>
              <div className="sec-tag">// The company</div>
              <h2>One company from the first sketch to the container</h2>
              <p className="sec-sub" style={{ marginBottom: 22 }}>
                A buyer who talks to four factories talks to four sets of tolerances,
                four schedules and four points where a promise can slip. We do the
                whole process ourselves so there is one place where a decision is
                made and one place where it is checked.
              </p>
              <div className="cap-list" style={{ marginTop: 0 }}>
                {[
                  ['Design and structural engineering', 'Frame geometry, backplate, hanging hole, dial and cover — designed and prototyped in-house.'],
                  ['Tooling and moulding', 'New tooling in 15–25 days, made in-house rather than subcontracted.'],
                  ['Surface finishing', 'UV spray, electroplating, brushing, antique brass effects, hand-painting.'],
                  ['Assembly', 'Movements sourced domestic or imported, assembled and tested on the same floor.'],
                  ['Export', 'Import and export qualification held, documentation supplied, packing to your requirement.']
                ].map(([h, p], i) => (
                  <div className="cap" key={h}>
                    <div className="cap-n">0{i + 1}</div>
                    <div><h4>{h}</h4><p>{p}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="hero-img" style={{ marginBottom: 20 }}>
                <img
                  src="/workshop-floor.jpg"
                  alt="Assembly floor: staff fitting dials and movements before packing"
                  width={1400}
                  height={933}
                  srcSet="/workshop-floor-720.jpg 720w, /workshop-floor.jpg 1400w"
                  sizes="(max-width: 900px) 92vw, 46vw"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: 16, marginBottom: 10 }}>Business licence</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                  Xiamen Chengmaomao Creative Home Furnishings Co., Ltd.
                  Established in Xiamen, China on 28 December 2023.
                </p>
                <a href="/media/factory/business-license.jpg" target="_blank" rel="noopener noreferrer">
                  <img
                    src="/media/factory/business-license.jpg"
                    alt="Business licence of Xiamen Chengmaomao Creative Home Furnishings Co., Ltd. (厦门橙猫创意家居有限公司), click to view full size"
                    width={1000} height={750} loading="lazy"
                    style={{ width: '100%', height: 'auto', borderRadius: 6, border: '1px solid var(--rule)' }}
                  />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Quality control ----
            Four gates between a finished movement and a sealed carton. The
            numbers are the point: a tolerance a buyer can check is worth
            more than the word "quality" on a photograph. */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Factory quality control</div>
              <h2>What every clock is checked for</h2>
              <p className="sec-sub">
                Four gates stand between a finished movement and a sealed carton. A
                clock that fails any one of them is not boxed. The full protocol,
                with factory footage of each gate, is on the craft and QC page.
              </p>
            </div>

            <div className="grid-2">
              {[
                {
                  n: 'Gate 01',
                  title: '24-hour movement ageing',
                  body:
                    'Every quartz movement runs on power for a full 24 hours before it goes near a clock, and its tick is measured acoustically in an anechoic chamber. Nothing is assembled from a movement that has not been run for a day.',
                  metric: '< 15 dB verified'
                },
                {
                  n: 'Gate 02',
                  title: 'Laser-guided hand calibration',
                  body:
                    'Hour, minute and second hands are checked on a laser-guided optical rig to confirm they run in one plane. Clearance between the hour and minute hands never drops below 1.5 mm, so no hand touches another and the sweep cannot drag.',
                  metric: '≥ 1.5 mm hand clearance'
                },
                {
                  n: 'Gate 03',
                  title: 'Semi-dust-free dial assembly',
                  body:
                    'Dials, glass and crystal porcelain are assembled in a controlled, semi-dust-free area, free of dust, fingerprints and foreign particles — the surfaces a buyer looks at first, and the ones a scratched cover cannot hide.',
                  metric: 'Semi-dust-free bench'
                },
                {
                  n: 'Gate 04',
                  title: '1.2 m drop test and final audit',
                  body:
                    'Packed cartons are sampled at random and dropped from 1.2 metres — one corner, three edges, six faces. A clock that cracks its cover or stops running does not leave the building.',
                  metric: '1.2 m · 6 faces'
                }
              ].map((g) => (
                <div className="card" key={g.n} style={{ padding: 26 }}>
                  <span className="qc-n">{g.n}</span>
                  <h3 style={{ fontSize: 16.5, marginBottom: 9 }}>{g.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 14 }}>
                    {g.body}
                  </p>
                  {/* The badge is sized to its text, not to the card.

                      A card is a flex column, so a block-level child
                      stretches to the full width of it — and the
                      measurement ends up as a blue bar across the
                      bottom of the card instead of a chip. */}
                  <div className="qc-metric tnum" style={{ alignSelf: 'flex-start' }}>
                    {g.metric}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26 }}>
              <Link href="/craft-qc" className="btn btn-ghost">See the QC protocol and factory footage →</Link>
            </div>
          </div>
        </section>

        {/* ---- Compliance ----
            Certification for a finished clock and certification for the
            movement inside it are two different questions, and a buyer
            who is told one answer to both has been told nothing. */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Compliance</div>
              <h2>Certification, stated plainly</h2>
              <p className="sec-sub">
                Finished quartz clocks carry no mandatory certification requirement
                for the markets we ship to. The compliance sits on the movement
                mechanism and on the raw materials, and that is where our
                certificates sit too.
              </p>
            </div>

            <div className="grid-2">
              <div className="card" style={{ padding: 26 }}>
                <h3 style={{ fontSize: 17, marginBottom: 16 }}>What we hold</h3>
                <div className="cert-list">
                  {CERTIFICATIONS.map((c) => (
                    <div className="cert-row" key={c.code}>
                      <span className="cert-code tnum">{c.code}</span>
                      <span className="cert-name">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 26 }}>
                <h3 style={{ fontSize: 17, marginBottom: 12 }}>What that means for you</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.75 }}>
                  Where a buyer needs documentation for their own market — an FCC
                  file, or a report issued in their company&rsquo;s name — we arrange
                  certified movement reports and component testing for that order
                  rather than claiming it in advance. What we publish above is what
                  is on file today, not a list of what could be arranged.
                </p>
                <div className="certs" style={{ marginTop: 20 }}>
                  <span className="cert">MOQ from {moq} pcs</span>
                  <span className="cert">Ex Works pricing</span>
                  <span className="cert">Movement reports on request</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Numbers ---- */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// The numbers</div>
              <h2>What we can commit to</h2>
              <p className="sec-sub">
                These are the terms a buyer is quoted against, and they are the ones
                the factory is measured on.
              </p>
            </div>

            <div className="grid-3">
              {[
                ['Minimum order', `${moq} pcs`, 'Colours and specifications can be mixed within a single order.'],
                ['Quote response', `${s.quoteHours || 4} hours`, 'With pricing broken down by tooling, unit, packaging and freight.'],
                ['Sample lead time', `${s.sampleDays || '5-7'} business days`, 'Sample cost credited against the first bulk order.'],
                ['Bulk lead time', '20–45 days', 'Shorter for a repeat design where the tooling already exists.'],
                ['Daily capacity', `${capacity} pcs`, 'Across one shift, at the current headcount.'],
                ['3D rendering', '24 hours', 'Photorealistic mockups before you commit to a sample.']
              ].map(([k, v, d]) => (
                <div className="card" key={k} style={{ padding: 24 }}>
                  <div className="tcard-n tnum" style={{ fontSize: 26, marginBottom: 4 }}>{v}</div>
                  <div className="tcard-t">{k}</div>
                  <div className="tcard-d" style={{ marginTop: 6 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Where to go next ---- */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Next step</div>
              <h2>Where would you like to start?</h2>
            </div>

            <div className="grid-3">
              {[
                ['Browse base platforms', 'Six material families, photographed and priced at Ex Works.', '/products'],
                ['See what we can customise', 'The six components of a clock, and which of them you can change.', '/custom-services'],
                ['Read the factory story', 'The long version: series, movements, certification and how an order runs.', '/p/factory']
              ].map(([t, d, href]) => (
                <Link key={t} href={href} className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>{t}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>{d}</p>
                  <span className="exw">Open →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Ready to launch ----
            Two ways to start, and both of them reach the same form. The
            first asks for a physical sample, the second asks for a price. */}
        <section>
          <div className="wrap" style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
            <div className="sec-tag">// Ready to launch</div>
            <h2>Ready to launch your custom wall clock line?</h2>
            <p className="sec-sub" style={{ marginBottom: 26 }}>
              Factory-direct communication, transparent Ex Works pricing, and a
              quotation back within {s.quoteHours || 4} hours. Send a reference
              photo, a sample or a sketch — whichever is easiest.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary">
                Request a custom sample ({s.sampleDays || '5-7'} days)
              </Link>
              <Link href="/contact" className="btn btn-ghost">
                Get an official quote (MOQ {moq}+)
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
