import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta, siteVideoMap } from '@/lib/db';
import type { SiteVideoSlot } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { TrustCards, Icons } from '../TrustCards';
import { SiteSchema } from '../SiteSchema';
import { VideoSlot, VideoSlotHydrator } from '../VideoSlot';
import { MATERIALS, QC_STEPS, FACTORY_FIGURES, CERTIFICATIONS } from '@/lib/vocabulary';

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
  const [s, videos] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings)),
    siteVideoMap().catch(() => ({} as Record<string, SiteVideoSlot>))
  ]);
  const moq = Number(s.moq) || 300;

  return (
    <div className="site">
      <SiteSchema s={s} />
      <SiteSchema s={s} />
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

            {/* The four process clips. The step number runs from one to
                four and the slot key does too, so the admin's list of
                outstanding videos lines up with the order on the page. */}
            <div className="qc-grid">
              {QC_STEPS.map((q, i) => (
                <div className="qc-item" key={q.n}>
                  <VideoSlot
                    youtubeId={videos[`qc-step-${i + 1}`]?.youtubeId || ''}
                    ratio="9:16"
                    title={q.title}
                    caption={`${q.title} — 9:16 factory footage`}
                  />
                  <span className="qc-n">{q.n}</span>
                  <h4>{q.title}</h4>
                  <p>{q.detail}</p>
                  <div className="qc-metric tnum">{q.metric}</div>
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
                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Certifications we hold</h3>
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

            {/* The factory's own figures. These are the numbers a buyer
                checks, so they are left empty until the factory confirms
                them rather than filled in from the specification. The
                structure is here, so the page is ready for the values. */}
            <div className="spec" style={{ marginTop: 28 }}>
              <div className="spec-h">Factory figures · pending confirmation</div>
              <div className="fig-grid">
                {FACTORY_FIGURES.map((f) => (
                  <div className="fig" key={f.key}>
                    <div className="fig-l">{f.label}</div>
                    <div className="fig-v">
                      <span className="fig-pending">—</span>
                      <span className="fig-u">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 14, lineHeight: 1.55 }}>
                These figures are being confirmed by the factory and will be published
                here once they are. Ask for them in your enquiry and we will send the
                current numbers.
              </p>
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
      <VideoSlotHydrator />
    </div>
  );
}
