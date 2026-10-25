import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { TrustCards, Icons } from '../TrustCards';
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
    title: 'About the Factory — Xiamen Chengmaomao Creative Home | Badoudao',
    description:
      `Xiamen Chengmaomao Creative Home Furnishings Co., Ltd. is a wall clock manufacturer in Xiamen, China. 10+ years in the trade, 2,000 pcs daily capacity, MOQ from ${s.moq || 300} pcs, 1,000+ hand styles and 7 movement types.`,
    keywords:
      'china wall clock manufacturer, xiamen clock factory, quartz clock OEM supplier, decorative clock factory',
    path: '/about-us'
  });
}

export default async function AboutUsPage() {
  const s = await getSettings().catch(() => ({} as SiteSettings));
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
            <div className="sec-tag">// About us</div>
            <h1>A factory in Xiamen, not a trading desk</h1>
            <p>
              Xiamen Chengmaomao Creative Home Furnishings Co., Ltd. manufactures
              decorative wall clocks. Design, tooling, production and export are all
              handled in-house.
            </p>
          </div>
        </section>

        <section style={{ padding: '56px 0' }}>
          <div className="wrap">
            <TrustCards
              items={[
                { value: '10+', title: 'Years in the trade', detail: 'Wall clock manufacturing and export', icon: Icons.clock },
                { value: String(moq), unit: ' pcs', title: 'Flexible minimum order', detail: 'Mixed colours and specs in one order', icon: Icons.box },
                { value: '1,000+', title: 'Hand styles in stock', detail: 'Ready to use, no tooling needed', icon: Icons.ruler },
                { value: '2,000', unit: ' pcs', title: 'Daily capacity', detail: 'Across one shift', icon: Icons.gear }
              ]}
            />
          </div>
        </section>

        {/* ---- The company ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
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

        {/* ---- Numbers ---- */}
        <section style={{ padding: '64px 0' }}>
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
                ['Quote response', `${s.quoteHours || 12} hours`, 'With pricing broken down by tooling, unit, packaging and freight.'],
                ['Sample lead time', `${s.sampleDays || '7-10'} days`, 'Sample cost credited against the first bulk order.'],
                ['Bulk lead time', '20–45 days', 'Shorter for a repeat design where the tooling already exists.'],
                ['Daily capacity', `${s.capacityMin || 2000} pcs`, 'Across one shift, at the current headcount.'],
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
        <section className="alt" style={{ padding: '64px 0' }}>
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
      </main>

      <Footer />
    </div>
  );
}
