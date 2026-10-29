import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { SiteSchema } from '../SiteSchema';
import { SIMPLIFIED } from '@/lib/vocabulary';
import { AnatomyHeading, RouteSection } from '../AnatomyModule';
import { AnatomyExplorer } from '../AnatomyExplorer';

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
      `What a wall clock is made of: frame, backplate, hands, movement, dial and lens cover, each independently customisable. The 28-day production calendar from drawing to container. MOQ from ${s.moq || 300} pcs, Ex Works pricing, samples in ${s.sampleDays || '5-7'} days.`,
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
      <SiteSchema s={s} />
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

        {/* ---- The anatomy ---- */}
        <section className="alt" id="anatomy">
          <div className="wrap">
            <AnatomyHeading />

            <AnatomyExplorer />

            <div className="anx-simplified">
              <div className="spec-h">Simplified structures</div>
              <p>
                Some designs are better off without parts. When a dial or a frame is
                not the point, removing it is a decision the factory can make — and
                a cheaper clock to build.
              </p>
              {/* The picture sits to the left of the words, small
                  enough to be a mark rather than a photograph. The
                  three cards describe a clock by what has been taken
                  away from it, and a reader who has not seen one has
                  nothing to picture. */}
              {SIMPLIFIED.map((s2) => (
                <div className="card sim-card" key={s2.name}>
                  <img
                    className="sim-ic"
                    src={s2.image}
                    alt=""
                    width={s2.imageWidth}
                    height={s2.imageHeight}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="sim-txt">
                    <h3>{s2.name}</h3>
                    <p>{s2.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- The 28-day route ---- */}
        <section>
          <div className="wrap">
            <RouteSection />
          </div>
        </section>

        {/* ---- Tooling and timeline ---- */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Tooling and lead time</div>
              <h2>What a new shape actually costs</h2>
            </div>

            <div className="grid-3">
              {[
                ['New tooling', '15–25 days for a new mould, made in-house so there is no subcontractor margin in the price.'],
                ['Sample', `${s.sampleDays || '5-7'} business days. A sealed sample is approved before the bulk run starts.`],
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

        {/* ---- The artwork guide ----

            The one thing a buyer cannot get from a photograph is the
            artwork template: what the dial file has to look like when
            it arrives, so that the first render is right rather than
            nearly right.

            There is no file to download here. A template that was
            written for one dial size would be wrong for the next one,
            and a dial guide is specific to the size and the movement
            the buyer has chosen. It is sent with the first quotation,
            against the specification that quotation is about. */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Artwork</div>
              <h2>What we need from you to draw the dial</h2>
              <p className="sec-sub">
                A dial artwork template comes with the first quotation —
                drawn to the size and the movement you have chosen,
                because a template written for one is wrong for the next.
                Here is what goes into it.
              </p>
            </div>

            <div className="grid-3">
              {[
                ['Vector artwork', 'AI, EPS, PDF or SVG. Text converted to outlines so the file renders the same on our machine as on yours.'],
                ['Print colours', 'Pantone solid coated or CMYK. A photograph of a colour is not a colour specification.'],
                ['Logo and mark', 'Vector, with the minimum size and the clear space written down. A bitmap logo on a dial is a blurry logo on a dial.'],
                ['Dial size', 'The finished diameter, not the diameter of the movement behind it. The two are not the same number.'],
                ['Numerals and markers', 'Which numerals, which font, and how close to the edge they sit. The rim needs room for them.'],
                ['Movement', 'Which movement the dial is drawn for — the centre hole and the hand spacing differ between them.']
              ].map(([n, d]) => (
                <div className="card" key={n} style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 15.5, marginBottom: 8 }}>{n}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{d}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26 }}>
              <Link href="/contact" className="btn btn-ghost">
                Ask for the dial template with your quote →
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <div className="sec-tag">// Next step</div>
            <h2 style={{ marginBottom: 12 }}>Send us the part you want to change</h2>
            <p className="sec-sub" style={{ marginBottom: 26 }}>
              A dial, a hand set, a frame profile, a packaging tier — tell us which one
              and the quote comes back within {s.quoteHours || 4} hours.
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
