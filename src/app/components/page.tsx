import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { SiteSchema } from '../SiteSchema';
import { MOVEMENTS, DISPLAYS, HAND_MATERIALS, HAND_SPEC_FIELDS, PACKAGING_TIERS } from '@/lib/vocabulary';

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
      `OEM clock components from a China factory: 1,000+ molded clock hand styles, 7 quartz and mechanical movements, 2 electronic displays and 3 packaging tiers. CE and RoHS certified silent sweep movements under 10 dBA. MOQ from ${s.moq || 300} pcs, Ex Works pricing.`,
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
      <SiteSchema s={s} />
      <TopBar />
      <Header />

      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="sec-tag">// Components studio</div>
            <h1>Modular component architecture for every layer of the clock</h1>
            <p>
              A quartz wall clock is six structural assemblies, and each one is
              customizable on its own. This is the reference for what the factory
              holds and what it can tool.
            </p>
          </div>
        </section>

        {/* ---- Movement matrix ---- */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Movement matrix</div>
              <h2>Seven movement tiers across one unified body platform</h2>
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
                    <th>Core drive and structure</th>
                    <th>Sound (dB)</th>
                    <th>Daily drift</th>
                    <th>Battery life</th>
                    <th>Where it sells</th>
                  </tr>
                </thead>
                <tbody>
                  {MOVEMENTS.map((m) => (
                    <tr key={m.name}>
                      <td>{m.name}</td>
                      <td>{m.drive}</td>
                      <td className="tnum">{m.db}</td>
                      <td className="tnum">{m.drift}</td>
                      <td className="tnum">{m.battery}</td>
                      <td>{m.scene}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---- Displays ---- */}
        <section>
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
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Clock hands · 1,000+ molded styles</div>
              <h2>Five materials, one specification per style</h2>
              <p className="sec-sub">
                Hands are the cheapest way to make a clock look like a different
                product. Every style in the library is a mold that already exists,
                so there is no tooling cost and no lead time for the hand itself.
              </p>
            </div>

            <div className="grid-3" style={{ marginBottom: 34 }}>
              {HAND_MATERIALS.map((h) => (
                <div className="card" key={h.key} style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>{h.name}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{h.note}</p>
                </div>
              ))}
            </div>

            {/* The fields each style is recorded with. The list of styles
                themselves is a thousand rows of a spreadsheet, and the
                factory has not issued it yet — so the page shows the
                structure the list will be loaded into rather than
                inventing a handful of rows to look complete. */}
            <div className="spec">
              <div className="spec-h">What each style records</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="mtx">
                  <thead>
                    <tr>
                      {HAND_SPEC_FIELDS.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {HAND_SPEC_FIELDS.map((f) => (
                        <td key={f.key}>{f.label}</td>
                      ))}
                      <td className="tnum">
                        {HAND_SPEC_FIELDS.map((f) => f.example).join(' · ')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 14, lineHeight: 1.55 }}>
                The style list is pending from the factory. Ask for the current
                catalogue and we will send it with the quotation.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Packaging ---- */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Packaging</div>
              <h2>Three tiers, and what each one is for</h2>
              <p className="sec-sub">
                Packaging is the difference between a clock that arrives intact and
                a return. The tiers below are the ones the factory packs to.
              </p>
            </div>

            <div className="grid-3">
              {PACKAGING_TIERS.map((t) => (
                <div className="card" key={t.tier} style={{ padding: 24 }}>
                  <div className="qc-n">{t.tier}</div>
                  <h3 style={{ fontSize: 17, margin: '4px 0 8px' }}>{t.name}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{t.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className="alt">
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
              <Link href="/custom-services" className="btn btn-ghost">See what we can customize</Link>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 20 }}>
              MOQ from {moq} pcs · Ex Works pricing · sample in {s.sampleDays || '5–7'} business days
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
