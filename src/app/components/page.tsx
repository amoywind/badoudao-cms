import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { TrustCards, Icons } from '../TrustCards';
import { MOVEMENTS, DISPLAYS } from '@/lib/vocabulary';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * The components studio.
 *
 * A buyer who has decided on a body still has six things to choose, and
 * the order they come in does not matter: hands, movement, display,
 * packaging. The page is a reference rather than a shop — there is no
 * price and no cart, because a component is not bought on its own.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Clock Hands, Movements & Packaging — Components Studio | Badoudao',
    description:
      `OEM clock components from a China factory: 1,000+ moulded clock hand styles, 7 quartz and mechanical movements, 2 electronic displays and 3 packaging tiers. MOQ from ${s.moq || 300} pcs, Ex Works pricing.`,
    keywords:
      'clock hands manufacturer, wholesale clock movements, quartz movement supplier, clock packaging OEM, custom clock components',
    path: '/components'
  });
}

export default async function ComponentsPage() {
  const s = await getSettings().catch(() => ({} as SiteSettings));
  const moq = Number(s.moq) || 300;

  return (
    <div className="site">
      <TopBar />
      <Header />

      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="sec-tag">// Components studio</div>
            <h1>Everything under the dial is a separate choice</h1>
            <p>
              A wall clock is six components, and each one is customisable on its own.
              This is the reference for what the factory holds and what it can tool.
            </p>
          </div>
        </section>

        <section style={{ padding: '56px 0' }}>
          <div className="wrap">
            <TrustCards
              items={[
                { value: '1,000+', title: 'Moulded hand styles', detail: 'Aluminium, brass, wood, acrylic and plastic', icon: Icons.ruler },
                { value: '7', title: 'Movement types', detail: 'Silent, radio-controlled, chime, mechanical', icon: Icons.gear },
                { value: '2', title: 'Display technologies', detail: 'LCD calendar and LED digital', icon: Icons.spark },
                { value: '3', title: 'Packaging tiers', detail: 'Kraft, gift box and custom foam insert', icon: Icons.box }
              ]}
            />
          </div>
        </section>

        {/* ---- Movement matrix ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Movement matrix</div>
              <h2>Seven movements, one body</h2>
              <p className="sec-sub">
                The same shell can be built with a ticking movement for the budget end or
                a radio-controlled sweep for the top. That is what lets one supplier
                build a price range rather than a single item.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="mtx">
                <thead>
                  <tr>
                    <th>Movement</th>
                    <th>Drive and characteristics</th>
                    <th>Sound</th>
                    <th>Where it sells</th>
                  </tr>
                </thead>
                <tbody>
                  {MOVEMENTS.map((m) => (
                    <tr key={m.name}>
                      <td>{m.name}</td>
                      <td>{m.drive}</td>
                      <td className="tnum">{m.db}</td>
                      <td>{m.scene}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---- Displays ---- */}
        <section style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Electronic displays</div>
              <h2>Two ways to show the time without a dial</h2>
              <p className="sec-sub">
                Both replace the movement and the dial entirely. A buyer choosing one of
                these is buying an electronic product, not a decorative clock.
              </p>
            </div>

            <div className="grid-2">
              {DISPLAYS.map((d) => (
                <div className="card" key={d.name} style={{ padding: 26 }}>
                  <h3 style={{ fontSize: 19, marginBottom: 10 }}>{d.name}</h3>
                  <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{d.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Hands ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Clock hands</div>
              <h2>1,000+ hand styles, five materials</h2>
              <p className="sec-sub">
                Hands are the cheapest way to make a clock look like a different product.
                Each style is moulded in aluminium, brass, solid wood, acrylic or plastic,
                with glow-in-the-dark and Pantone matching on request.
              </p>
            </div>

            <div className="grid-3">
              {[
                ['Aluminium', 'Light, crisp, the default for modern and industrial designs. Anodised in any Pantone.'],
                ['Brass', 'Heavier and warmer, with a hand-polished or brushed finish. The traditional choice.'],
                ['Solid wood', 'Cut from the same species as the frame, so the grain matches.'],
                ['Acrylic', 'Transparent or frosted, and the only option that reads correctly over a printed dial.'],
                ['Plastic', 'Injection moulded in the dial colour, for the volume end. Pantone matched.'],
                ['Custom length', 'Hands cut to a specified length and counterweight for oversized or odd-shaped dials.']
              ].map(([n, d]) => (
                <div className="card" key={n} style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>{n}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Packaging ---- */}
        <section style={{ padding: '64px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Packaging</div>
              <h2>Three tiers, and what each one is for</h2>
              <p className="sec-sub">
                Packaging is the difference between a clock that arrives intact and a
                return. The tiers below are the ones the factory packs to.
              </p>
            </div>

            <div className="grid-3">
              {[
                ['Mail-order kraft box', 'Corrugated kraft, one clock per box. The economical choice, and the one that passes the 1.2m drop test as standard.'],
                ['Colour gift box', 'Printed folding carton with an insert. What a direct-to-consumer brand needs for a shelf that looks like retail.'],
                ['Custom foam insert', 'EPE foam or moulded pulp, cut to the clock. For fragile resin, acrylic and glass bodies, and for a gift presentation.']
              ].map(([n, d], i) => (
                <div className="card" key={n} style={{ padding: 24 }}>
                  <div className="qc-n">Tier 0{i + 1}</div>
                  <h3 style={{ fontSize: 17, margin: '4px 0 8px' }}>{n}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className="alt" style={{ padding: '64px 0' }}>
          <div className="wrap" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <div className="sec-tag">// Next step</div>
            <h2 style={{ marginBottom: 12 }}>Tell us the combination you need</h2>
            <p className="sec-sub" style={{ marginBottom: 26 }}>
              Movement, hands, dial and packaging — send the combination and the
              quantity, and the quote comes back with the sample timeline inside{' '}
              {s.quoteHours || 12} hours.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary">Request a quote</Link>
              <Link href="/custom-services" className="btn btn-ghost">See what we can customise</Link>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 20 }}>
              MOQ from {moq} pcs · Ex Works pricing · sample in {s.sampleDays || '7-10'} days
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
