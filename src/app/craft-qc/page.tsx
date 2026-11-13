import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta, siteVideoMap } from '@/lib/db';
import type { SiteVideoSlot } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { SiteSchema } from '../SiteSchema';
import { QcStepSwitcher } from '../QcStepSwitcher';
import { MATERIALS, QC_STEPS, FACTORY_FIGURES, CERTIFICATIONS } from '@/lib/vocabulary';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Material and craft, plus the QC process.
 *
 * The page head keeps its factory banner photo. Only the copy inside the
 * band changed — the photo, the white fade that keeps the heading readable
 * and the -720 phone cut all come from globals.css / responsive.css, keyed
 * on data-bg="qc". Nothing in those rules is touched here.
 *
 * The QC section is now one step switcher rather than four side-by-side
 * cards. The animated instrument panel doubles as the video placeholder:
 * when the admin fills a qc-step-N YouTube id, that step shows a lazy
 * player instead, so no existing footage slot is orphaned.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Material & Craft — 8 Materials, 4-Step QC Factory | Badoudao',
    description:
      `Eight core materials with their processes, and the four QC steps every clock passes: raw material checks, 24-hour movement aging, pointer balance and 1.2m drop-tested packaging. MOQ from ${s.moq || 300} pcs.`,
    keywords:
      'clock manufacturing process, quartz clock QC, drop test packaging, acrylic clock printing, resin clock casting',
    path: '/craft-qc'
  });
}

/* Thresholds are the ones already recorded in QC_STEPS. They are written
   out as checkpoint lines rather than derived from prose so the switcher
   can render them as a list, but every number here matches the metric on
   the same row of the shared vocabulary. */
const CHECKPOINTS: string[][] = [
  [
    'Moisture content: 8–12%',
    'Burr-free laser edge on metal sheet',
    'Surface scratch inspection before cutting'
  ],
  [
    '24-hour continuous timekeeping verification',
    'Anechoic chamber background < 10 dBA',
    'Movement above 12 dBA is scrapped'
  ],
  [
    'Vertical hand clearance ≥ 1.5mm',
    'Hands pressed on a pneumatic jig',
    'Sweep never catches on the dial'
  ],
  [
    '1.2m free fall impact on concrete floor',
    'Zero crack on glass lens cover',
    'Movement gears remain aligned and running'
  ]
];

/* Neutral scope notes. No third-party audit body is named: unless a
   certificate names the issuer, claiming "audited by X" is a verifiable
   assertion the site cannot support. */
const CERT_SCOPE = [
  'CERTIFICATE ON REQUEST',
  'CERTIFICATE ON REQUEST',
  'MOVEMENT & MATERIALS',
  'MOVEMENT & MATERIALS',
  'MATERIAL DECLARATIONS'
];

export default async function CraftQcPage() {
  const [s, videos] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings)),
    siteVideoMap().catch(() => ({} as Record<string, SiteVideoSlot>))
  ]);
  const moq = Number(s.moq) || 300;

  const steps = QC_STEPS.map((q, i) => ({
    n: q.n,
    title: q.title,
    /* The metric is the pass threshold already used elsewhere on the site,
       so the "Standard" line cannot drift away from the factory's figures. */
    standard: q.metric,
    desc: q.detail,
    checkpoints: CHECKPOINTS[i] || [],
    videoId: videos[`qc-step-${i + 1}`]?.youtubeId || '',
    videoTitle: `${q.title} — factory footage`
  }));

  return (
    <div className="site">
      <SiteSchema s={s} />
      <TopBar />
      <Header />

      <main id="main">
        {/* The banner photo and its white fade are unchanged. Only the
            content inside the band is new. */}
        <section className="page-head" data-bg="qc">
          <div className="wrap">
            <nav className="qcsw-crumb" aria-label="Breadcrumb">
              <Link href="/">← Home</Link><span>/</span>
              <span>4-Step Quality Control &amp; Certifications</span>
            </nav>
            <div className="qcsw-badge">
              100% FULL-BATCH 24H AGING · 1.2M ISTA-1A DROP TEST
            </div>
            <div className="qcsw-hero">
              <div>
                <h1>Quality Assurance &amp; Testing Standards</h1>
                <p>
                  Zero tolerance for noisy movements or transit breakage. Every
                  production batch is subjected to moisture laser measurement,
                  continuous 24-hour anechoic aging, hand-clearance alignment,
                  and concrete free-fall drop tests.
                </p>
              </div>
              <Link href="/contact" className="qcsw-cta">
                ORDER QUALITY SAMPLE (7 DAYS)
              </Link>
            </div>
          </div>
        </section>

        {/* ---- QC step switcher ---- */}
        <section>
          <div className="wrap">
            <QcStepSwitcher steps={steps} />

            {/* The five certificates the factory actually holds, followed by
                the plain-language caveat. The caveat is not decoration: it
                states which paperwork exists and which is arranged per
                order, so a buyer does not read a badge as an import approval. */}
            <div className="qcsw-certs">
              <div className="qcsw-certs-tag">// COMPLIANCE &amp; DOCUMENTATION</div>
              <h3>Documentation available for our main export markets</h3>
              <div className="qcsw-cert-grid">
                {CERTIFICATIONS.map((c, i) => (
                  <div className="qcsw-cert" key={c.code}>
                    <div className="qcsw-cert-code">{c.code}</div>
                    <div className="qcsw-cert-name">{c.name}</div>
                    <div className="qcsw-cert-foot">{CERT_SCOPE[i] || ''}</div>
                  </div>
                ))}
              </div>
              <p className="qcsw-cert-caveat">
                Finished quartz clocks carry no mandatory certification
                requirement for the markets we ship to — the requirement sits
                on the movement and on the materials. Where a buyer needs
                specific paperwork for their own market, we arrange it for the
                order rather than claiming it in advance.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Material matrix: retained, not replaced ---- */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// 8 core materials</div>
              <h2>What each material can be made to do</h2>
              <p className="sec-sub">
                The processes listed here are the ones the factory runs in-house. They
                are the difference between a molded clock and a designed one.
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

        {/* ---- Factory figures: retained ---- */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Factory figures</div>
              <h2>The factory in numbers</h2>
            </div>
            <div className="spec">
              <div className="spec-h">The factory in numbers</div>
              <div className="fig-grid">
                {FACTORY_FIGURES.map((f) => (
                  <div className="fig" key={f.key}>
                    <div className="fig-l">{f.label}</div>
                    <div className="fig-v">
                      <span className="fig-n tnum">{f.value}</span>
                      <span className="fig-u">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="certs" style={{ marginTop: 20 }}>
              <span className="cert">MOQ from {moq} pcs</span>
              <span className="cert">Ex Works pricing</span>
            </div>
          </div>
        </section>

        <section className="alt">
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
