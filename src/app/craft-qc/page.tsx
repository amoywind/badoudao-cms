import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { TrustCards, Icons } from '../TrustCards';
import { MATERIALS, QC_STEPS } from '@/lib/vocabulary';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Material and craft, plus the QC process.
 *
 * The material section is the specification's six-column matrix, and it
 * uses the same vocabulary file as the home page — the process names for
 * a material are the same wherever they appear.
 *
 * The QC section carries video slots. There is no video in the media
 * library yet, so the slots say what they are waiting for rather than
 * showing a broken player. The slot carries the step number and what
 * the footage shows, so whoever produces it knows what goes where.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Material & Craft — 6 Materials, 4-Step QC Factory | Badoudao',
    description:
      `Six core materials with their processes, and the four QC steps every clock passes: raw material checks, 24-hour movement aging, pointer balance and 1.2m drop-tested packaging. MOQ from ${s.moq || 300} pcs.`,
    keywords:
      'clock manufacturing process, quartz clock QC, drop test packaging, acrylic clock printing, resin clock casting',
    path: '/craft-qc'
  });
}

export default async function CraftQcPage() {
  const s = await getSettings().catch(() => ({} as SiteSettings));
  const moq = Number(s.moq) || 300;

  return (
    <div className="site">
      <TopBar />
      <Header />

      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="sec-tag">// Material &amp; craft</div>
            <h1>Six materials, four QC steps, one building</h1>
            <p>
              What each material can be made to do, and what every clock is put through
              before it is allowed into a carton.
            </p>
          </div>
        </section>

        <section style={{ padding: '56px 0' }}>
          <div className="wrap">
            <TrustCards
              items={[
                { value: '24', unit: ' hr', title: 'Aging QC', detail: '100% of movements tested', icon: Icons.clock },
                { value: '0.1', unit: 'mm', title: 'Precision', detail: 'Laser and CNC tolerances', icon: Icons.ruler },
                { value: '6', unit: '-side', title: 'Drop test', detail: 'Passed to ISTA-1A standard', icon: Icons.shield },
                { value: '4', title: 'QC stages', detail: 'IQC, IPQC, FQC and OQC', icon: Icons.box }
              ]}
            />
          </div>
        </section>

        {/* ---- Material matrix ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// 6 core materials</div>
              <h2>What each material can be made to do</h2>
              <p className="sec-sub">
                The processes listed here are the ones the factory runs in-house. They
                are the difference between a moulded clock and a designed one.
              </p>
            </div>

            <div className="grid-3">
              {MATERIALS.map((m) => (
                <div className="card" key={m.slug} style={{ padding: 24 }}>
                  <Link href={`/products/${m.slug}`} style={{ display: 'block' }}>
                    <h3 style={{ fontSize: 17, marginBottom: 9 }}>{m.name}</h3>
                  </Link>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                    {m.blurb}
                  </p>
                  <div className="ctags">
                    {m.tags.map((t) => <span className="ctag on" key={t}>{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- QC steps ---- */}
        <section style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Factory QC protocol</div>
              <h2>Four steps every clock passes</h2>
              <p className="sec-sub">
                The four stages between raw material and a sealed carton. Each one is
                a gate: a clock that fails any of them does not go in the box.
              </p>
            </div>

            <div className="qc-grid">
              {QC_STEPS.map((q) => (
                <div className="qc-item" key={q.n}>
                  <div className="vslot vslot-16">
                    <div className="vslot-ico">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                    </div>
                    <span className="vslot-t">Video pending</span>
                    <span className="vslot-d">{q.title} — 9:16 factory footage</span>
                  </div>
                  <span className="qc-n">{q.n}</span>
                  <h4>{q.title}</h4>
                  <p>{q.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Certifications ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Certification</div>
              <h2>What is certified, and what is not</h2>
              <p className="sec-sub">
                This matters more than a badge, so it is stated plainly rather than
                implied.
              </p>
            </div>

            <div className="grid-2">
              <div className="card" style={{ padding: 26 }}>
                <h3 style={{ fontSize: 18, marginBottom: 12 }}>Certifications we hold</h3>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.8 }}>
                  <li>ISO 9001 quality management</li>
                  <li>BSCI social compliance</li>
                  <li>CE and RoHS on all movements</li>
                  <li>REACH on materials in contact with the dial</li>
                  <li>ISTA-1A packaging drop test</li>
                </ul>
              </div>
              <div className="card" style={{ padding: 26 }}>
                <h3 style={{ fontSize: 18, marginBottom: 12 }}>What to know</h3>
                <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.75 }}>
                  Finished quartz clocks carry no mandatory certification requirement for
                  the markets we ship to — the requirement sits on the movement and on
                  the materials. Where a buyer needs specific paperwork for their own
                  market, we arrange it for the order rather than claiming it in advance.
                </p>
                <div className="certs" style={{ marginTop: 18 }}>
                  <span className="cert">MOQ from {moq} pcs</span>
                  <span className="cert">Ex Works pricing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 0' }}>
          <div className="wrap" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <div className="sec-tag">// Next step</div>
            <h2 style={{ marginBottom: 12 }}>Ask for the QC report on your order</h2>
            <p className="sec-sub" style={{ marginBottom: 26 }}>
              Every shipment can be supplied with the inspection records for that
              production run. Send the specification and the quantity.
            </p>
            <Link href="/contact" className="btn btn-primary">Request a quote</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
