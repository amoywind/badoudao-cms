import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { InquiryForm } from '../InquiryForm';
import { CustomizerHub } from '../CustomizerHub';
import { TABS } from '@/lib/hub-data';
import { SiteSchema } from '../SiteSchema';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * The customizer hub, on a page of its own.
 *
 * The home page carries the promise; this page carries the tool. A
 * buyer who lands from a search for "wall clock configurator" or
 * "OEM clock specification" arrives here with a question, and the
 * answer is a page that answers it rather than a section four screens
 * down a page about something else.
 *
 * The hub and the enquiry form are on the same page, and that is not
 * a layout decision — it is how the specification reaches the factory.
 * The hub writes the code into a hidden field inside the form, and
 * the form reads it with FormData. Split them across two pages and
 * the code has to travel through a URL instead, and a buyer who
 * chooses four options and then closes the tab has lost them.
 *
 * The anatomy and the 28-day calendar stay on the custom-services
 * page. They are the subject of that page; the customizer is the
 * subject of this one.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Wall Clock Configurator — Build Your OEM Spec | Badoudao',
    description:
      `Configure a custom quartz wall clock: housing, movement, hands and packaging. Get a written specification the factory quotes against. MOQ from ${s.moq || 300} pcs, Ex Works pricing, quotation within ${s.quoteHours || 4} hours.`,
    keywords:
      'wall clock configurator, custom wall clock builder, OEM clock specification, custom clock quote tool, bespoke clock manufacturer',
    path: '/customizer'
  });
}

export default async function CustomizerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await getSettings().catch(() => ({} as SiteSettings));
  const moq = Number(s.moq) || 300;
  const replyHours = Number(s.quoteHours) || 4;

  /* The home page's quick picker sends the four choices in the URL, so
     a buyer who sets a preference there arrives here with it already
     made. Only the codes that exist are read — a hand-edited URL
     cannot make the tool show an option that does not exist. */
  const params = await searchParams.catch(() => ({} as Record<string, string | string[] | undefined>));
  const initial: Record<string, string> = {};
  for (const t of TABS) {
    const raw = params[t.key];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (!v) continue;
    const code = String(v).slice(0, 16);
    if (t.choices.some((c) => c.code === code)) initial[t.key] = code;
  }

  return (
    <div className="site">
      <SiteSchema s={s} />
      <TopBar />
      <Header />

      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="sec-tag">// Customizer hub</div>
            <h1>Build a clock specification, then send it</h1>
            <p>
              Four decisions make a clock. Choose them here and the specification
              assembles itself into a code the factory quotes against — no email
              describing options in prose, and no guessing which of the movements
              you meant.
            </p>
            <div className="certs" style={{ marginTop: 18 }}>
              <span className="cert">MOQ from {moq} pcs</span>
              <span className="cert">Mixed colours and specs in one order</span>
              <span className="cert">Ex Works pricing</span>
              <span className="cert">Quotation in {replyHours} hours</span>
            </div>
          </div>
        </section>

        {/* ---- The customizer ---- */}
        <section id="studio">
          <div className="wrap">
            <CustomizerHub replyHours={replyHours} initial={initial} />
          </div>
        </section>

        {/* ---- The enquiry ---- */}
        <section id="inquiry" className="alt">
          <div className="wrap">
            <div className="sec-head" style={{ maxWidth: 620 }}>
              <div className="sec-tag">// Direct factory RFQ</div>
              <h2>Send it to the factory</h2>
              <p className="sec-sub">
                The specification you just built is attached to this form. Add a
                quantity and a drawing if you have one — everything else is already
                written down.
              </p>
            </div>

            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="cap-list">
                  {[
                    ['Your specification goes with the enquiry', 'The four choices, as a code, in the first line of the message the factory reads.'],
                    ['A quotation inside four hours', 'A price broken down by tooling, unit, packaging and freight.'],
                    ['A 3D rendering before tooling', 'Photorealistic, so the shape is agreed before a mould is cut.'],
                    ['Samples in 5-7 business days', 'The sample fee is credited against the first bulk order.']
                  ].map(([h, p], i) => (
                    <div className="cap" key={h}>
                      <div className="cap-n">0{i + 1}</div>
                      <div><h4>{h}</h4><p>{p}</p></div>
                    </div>
                  ))}
                </div>
                <div className="certs" style={{ marginTop: 28 }}>
                  <span className="cert">MOQ from {moq} pcs</span>
                  <span className="cert">Samples in {s.sampleDays || '5-7'} business days</span>
                  <span className="cert">Ex Works pricing</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 14, lineHeight: 1.6 }}>
                  Want to know what each part is first?{' '}
                  <Link href="/custom-services#anatomy" style={{ textDecoration: 'underline' }}>
                    Read the six-component anatomy
                  </Link>{' '}
                  — and the 28-day production calendar.
                </p>
              </div>
              <div>
                <InquiryForm replyHours={replyHours} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
