import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { Icons } from '../TrustCards';
import { SiteSchema } from '../SiteSchema';

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
        <div className="wrap">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            About the factory
          </nav>
        </div>

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

        {/* ---- The factory, and what it can do ----

            Two columns. The left says what the factory is for and what a
            buyer cannot get elsewhere; the right is the specification of
            the plant itself, in the form a buyer can check.

            The four advantages are the ones a supplier who buys clocks and
            resells them cannot offer, because each of them is a machine or
            a process the factory owns rather than a price it can match. */}
        {/* The left column is the argument and the right column is the
            evidence, so the left is given more of the width — seven
            twelfths against five. The photo and the licence sit under
            the factsheet on the right because they are the two things
            nobody can talk around. */}
        <section>
          <div
            className="wrap split"
            style={{ alignItems: 'start', gridTemplateColumns: '7fr 5fr' }}
          >
            <div>
              <div className="sec-tag">// The company</div>
              <h2>A factory in Xiamen, not a trading desk</h2>
              <p className="sec-sub" style={{ marginBottom: 22 }}>
                A supplier who buys clocks and resells them can match a price.
                He cannot change the tooling, the packing or the test a clock
                passes before it leaves the building. We own the machines, so
                those three are decided here rather than negotiated with a
                third party.
              </p>

              <div className="cap-list" style={{ marginTop: 0 }}>
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
                  },
                  {
                    icon: Icons.clock,
                    title: '24-hour drawing, sample in days',
                    body:
                      'A photorealistic 3D rendering and the dial artwork come back inside 24 hours, so a buyer can see the product before paying for tooling. Physical samples of existing moulds ship within the week; a new shape takes two weeks of tooling first.'
                  }
                ].map((c) => (
                  <div className="cap" key={c.title}>
                    <div className="tcard-ico">{c.icon}</div>
                    <div>
                      <h4>{c.title}</h4>
                      <p>{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* The factsheet. Every figure here is one a buyer can check
                — against the business licence, against the export
                documents, or against a visit. */}
            <div>
              {/* The workshop photograph and the licence, as they were:
                  the picture of the floor and the document that says
                  who works on it, one above the other, in the column
                  that is about the factory itself. */}
              <div className="hero-img" style={{ marginBottom: 20 }}>
                <img
                  src="/workshop-floor.jpg"
                  alt="Assembly floor: staff fitting dials and movements before packing"
                  width={1400}
                  height={933}
                  srcSet="/workshop-floor-720.jpg 720w, /workshop-floor.jpg 1400w"
                  sizes="(max-width: 900px) 92vw, 40vw"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="card" style={{ padding: 22, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 10 }}>Business licence</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                  Xiamen Chengmaomao Creative Home Furnishings Co., Ltd.
                  Established in Xiamen, China on 28 December 2023.
                  Click the licence to open it at full size.
                </p>
                <a
                  href="/media/factory/business-license.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block' }}
                >
                  <img
                    src="/media/factory/business-license.jpg"
                    alt="Business licence of Xiamen Chengmaomao Creative Home Furnishings Co., Ltd. (厦门橙猫创意家居有限公司), click to view full size"
                    width={1000} height={750} loading="lazy"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      borderRadius: 6,
                      border: '1px solid var(--rule)'
                    }}
                  />
                </a>
              </div>

              <div className="card" style={{ padding: 26 }}>
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Factory factsheet</h3>
                <div className="cert-list">
                  {[
                    ['Legal entity', 'Xiamen Chengmaomao Creative Home Furnishings Co., Ltd.'],
                    ['Registered', 'Xiamen, China — 28 December 2023'],
                    ['Plant', 'Four lines under one roof: injection, woodwork, metal CNC, dust-free assembly'],
                    ['Daily capacity', `${capacity} pcs across one shift`],
                    ['People', 'Assembly and engineering staff on the floor, with six designers and CAD draughtsmen'],
                    ['Shipping port', 'Port of Xiamen (XMN)'],
                    ['Enquiries', 'amoywind@gmail.com']
                  ].map(([k, v]) => (
                    <div className="cert-row" key={k}>
                      <span className="cert-code tnum">{k}</span>
                      <span className="cert-name">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* ---- The machinery ----

            The machines are named because a buyer cannot otherwise tell
            whether a factory that says it makes to order owns the means
            to make it. */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Machinery</div>
              <h2>The machines behind the quote</h2>
              <p className="sec-sub">
                A factory that says it makes to order should be able to say
                what it makes them on. These are the machines in the building,
                not a list of what could be subcontracted.
              </p>
            </div>

            <div className="grid-2">
              {[
                {
                  icon: Icons.ruler,
                  title: 'CNC machining',
                  body:
                    'Five-axis routing for frames, hands and moulded parts, with a new tool path cut from a buyer drawing rather than bought in from a shop.'
                },
                {
                  icon: Icons.spark,
                  title: 'UV flatbed printing',
                  body:
                    'Eight-colour UV direct printing on dials and dial faces, so a buyer can send artwork in a file and get colour that matches it rather than a colour from a catalogue.'
                },
                {
                  icon: Icons.box,
                  title: 'Injection and moulding',
                  body:
                    'In-house tooling for new shapes, so a genuinely different body is a two-week wait rather than a negotiation with a moulding shop.'
                },
                {
                  icon: Icons.clock,
                  title: 'Anechoic test room',
                  body:
                    'A sound-treated room for measuring the tick of a movement, with the background noise low enough that the reading means something.'
                }
              ].map((m) => (
                <div className="card" key={m.title} style={{ padding: 24 }}>
                  <div className="tcard-ico">{m.icon}</div>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>{m.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Buyer FAQ ----

            The four questions a first-time buyer actually asks, in the
            order they ask them. Each answer gives a number where a
            number exists, because a number is what can be relied on. */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Buyer questions</div>
              <h2>The four questions buyers ask first</h2>
              <p className="sec-sub">
                These are the questions that decide whether an order goes ahead,
                answered with the numbers rather than with adjectives.
              </p>
            </div>

            <div className="grid-2">
              {[
                {
                  n: 'Q1',
                  q: 'What is the minimum order?',
                  a: `${moq} pieces, and you can mix dial colours and specifications inside that one order — different hand finishes, different movements, different dial artwork in the same shipment. A new product can be tested on the market without committing to a run of two thousand.`
                },
                {
                  n: 'Q2',
                  q: 'How long does a sample take?',
                  a: `An existing mould ships within ${s.sampleDays || '5-7'} business days. A brand-new shape needs tooling first, which takes two to three weeks. The sample cost is credited against the first bulk order, so the sample is not a cost — it is the first payment.`
                },
                {
                  n: 'Q3',
                  q: 'How do you guarantee it is quiet?',
                  a: 'Every movement runs on power for a full 24 hours before assembly, and its tick is measured acoustically in a sound-treated room. The reading is on the record for that batch, and a movement that measures over the limit is scrapped rather than adjusted and passed on.'
                },
                {
                  n: 'Q4',
                  q: 'Will it survive the delivery?',
                  a: 'Each clock is wrapped in custom-cut EPE pearl-cotton inside a mail-order-grade carton, and packed cartons are sampled and dropped from 1.2 metres — one corner, three edges, six faces. A clock that cracks its cover or stops running does not leave the building.'
                }
              ].map((f) => (
                <div className="card" key={f.n} style={{ padding: 24 }}>
                  <span className="qc-n">{f.n}</span>
                  <h3 style={{ fontSize: 16.5, marginBottom: 9 }}>{f.q}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26 }}>
              <Link href="/craft-qc" className="btn btn-ghost">See the QC protocol and factory footage →</Link>
            </div>
          </div>
        </section>

        {/* ---- Numbers ----

            The terms a buyer is quoted against. The noise figures and the
            QC protocol itself are on the craft page rather than here, so
            that the same test is not described two ways in two places. */}
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

        {/* ---- Where the certification is ----

            The certificates are on the craft and QC page, beside the
            tests they come from, because a certificate on its own says
            very little — what a buyer needs to know is which document
            covers which part of the clock, and that answer is written
            where the parts are. This page says where to find it rather
            than repeating the list. */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Certification</div>
              <h2>What is certified, and what is not</h2>
              <p className="sec-sub">
                A finished quartz clock carries no mandatory certification
                requirement for the markets we ship to — the requirement
                sits on the movement and on the raw materials. What is on
                file, and what can be arranged for an order in the buyer&rsquo;s
                own company name, is set out on the craft and QC page.
              </p>
            </div>

            <Link href="/craft-qc" className="btn btn-ghost">
              See the certifications and what they cover →
            </Link>
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
