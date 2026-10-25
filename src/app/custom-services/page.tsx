import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { TrustCards, Icons } from '../TrustCards';
import { ANATOMY, SIMPLIFIED } from '@/lib/vocabulary';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Custom services and structural anatomy.
 *
 * The question this page answers is "what exactly can you change, and how
 * do we work together". It is a decomposition rather than a product
 * list: a buyer who understands that a clock is six parts can decide
 * which parts to change, and a buyer who does not can read the list and
 * send a drawing anyway.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Custom Services & Clock Anatomy — OEM/ODM | Badoudao',
    description:
      `What a wall clock is made of: frame, backplate, hands, movement, dial and lens cover, each independently customisable. MOQ from ${s.moq || 300} pcs, Ex Works pricing, samples in ${s.sampleDays || '7-10'} days.`,
    keywords:
      'custom clock manufacturer, OEM clock parts, private label wall clock, clock dial printing, bespoke clock supplier',
    path: '/custom-services'
  });
}

export default async function CustomServicesPage() {
  const s = await getSettings().catch(() => ({} as SiteSettings));
  const moq = Number(s.moq) || 300;

  return (
    <div className="site">
      <TopBar />
      <Header />

      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="sec-tag">// Custom services</div>
            <h1>What you can change, and how we work together</h1>
            <p>
              A wall clock is six components. Each one is a decision, and each one is
              open to you — material, finish, mechanism, artwork and packaging.
            </p>
          </div>
        </section>

        <section style={{ padding: '56px 0' }}>
          <div className="wrap">
            <TrustCards
              items={[
                { value: '6', title: 'Core modular components', detail: 'Free mixing and matching', icon: Icons.box },
                { value: '1,000+', title: 'Moulded hand styles', detail: 'Ready-to-use hand moulds', icon: Icons.ruler },
                { value: '100%', title: 'Custom shape', detail: 'CNC, laser and injection', icon: Icons.spark },
                { value: '3', title: 'Packaging tiers', detail: 'Kraft, gift box, custom insert', icon: Icons.shield }
              ]}
            />
          </div>
        </section>

        {/* ---- The anatomy ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Visual anatomy</div>
              <h2>Six components, six decisions</h2>
              <p className="sec-sub">
                The exploded view of a wall clock. Every part is specified separately,
                which is why a quote can be broken down by tooling, unit, packaging
                and freight.
              </p>
            </div>

            <div className="anat">
              <div className="anat-list">
                {ANATOMY.map((a) => (
                  <div className="anat-i" key={a.n}>
                    <span className="anat-n">{a.n}</span>
                    <div>
                      <h4>{a.name}</h4>
                      <p>{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="spec-h">Simplified structures</div>
                <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20 }}>
                  Some designs are better off without parts. When a dial or a frame is
                  not the point, removing it is a decision the factory can make — and
                  a cheaper clock to build.
                </p>
                {SIMPLIFIED.map((s2) => (
                  <div className="card" key={s2.name} style={{ padding: 20, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15.5, marginBottom: 7 }}>{s2.name}</h3>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{s2.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- How we work ---- */}
        <section style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// How an order runs</div>
              <h2>From a reference photo to a shipped container</h2>
            </div>

            <div className="proc">
              {[
                ['Talk it through', 'Quantity, target price, market and packaging. A reference photo, a sample or a sketch is enough to start.'],
                ['Specification & quote', `We propose the specification and quote Ex Works, within ${s.quoteHours || 12} hours.`],
                ['Sample', `${s.sampleDays || '7-10'} days. The sample cost is credited against the first bulk order.`],
                ['Mass production', 'In-process inspection, with photo and video updates as the run progresses.'],
                ['Final inspection', 'Every carton checked before it is closed.'],
                ['Shipment', 'Documents supplied, and we stay available afterwards.']
              ].map(([h, p], i) => (
                <div className="proc-i" key={h}>
                  <span className="proc-n">STEP 0{i + 1}</span>
                  <h4>{h}</h4><p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Tooling and timeline ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Tooling and lead time</div>
              <h2>What a new shape actually costs</h2>
            </div>

            <div className="grid-3">
              {[
                ['New tooling', '15–25 days for a new mould, made in-house so there is no subcontractor margin in the price.'],
                ['Sample', `${s.sampleDays || '7-10'} days. A sealed sample is approved before the bulk run starts.`],
                ['Mass production', '20–45 days depending on complexity. Lead time for a repeat design is shorter.'],
                ['Vector files', 'AI, CAD, PDF or EPS. A dial artwork template comes with the first quote.'],
                ['Custom moulds', '3D scanning and prototyping for shapes that do not exist yet, from a photo or a sketch.'],
                ['Minimum order', `MOQ from ${moq} pcs, and colours and specifications can be mixed within one order.`]
              ].map(([n, d]) => (
                <div className="card" key={n} style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>{n}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 0' }}>
          <div className="wrap" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <div className="sec-tag">// Next step</div>
            <h2 style={{ marginBottom: 12 }}>Send us the part you want to change</h2>
            <p className="sec-sub" style={{ marginBottom: 26 }}>
              A dial, a hand set, a frame profile, a packaging tier — tell us which one
              and the quote comes back within {s.quoteHours || 12} hours.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary">Request a quote</Link>
              <Link href="/components" className="btn btn-ghost">Browse components</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
