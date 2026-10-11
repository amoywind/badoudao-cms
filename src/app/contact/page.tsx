/**
 * Dedicated contact page.
 *
 * The enquiry form is reachable from every page via the #inquiry anchor, but
 * a standalone /contact/ URL is what buyers and Google both look for — it
 * gives the conversion a keyword-matchable landing page ("contact", "get a
 * quote", "factory enquiry") instead of burying it below the fold on home.
 */
import type { SiteSettings } from '@/lib/db';
import { getSettings, listProducts } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { InquiryForm } from '../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  let s: SiteSettings = {};
  try { s = await getSettings(); } catch {}

  const title = `Contact Badoudao | Get a Quotation for Wholesale Clocks`;
  const description = `Request a quotation for OEM and ODM quartz clocks from Badoudao. MOQ from ${s.moq || 500} pieces, Ex Works pricing, reply within ${s.quoteHours || 12} hours.`;

  return {
    title,
    description,
    alternates: { canonical: '/contact/' },
    openGraph: { title, description, type: 'website' }
  };
}

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const [s, products] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings)),
    listProducts({ status: 'published' }).catch(() => [])
  ]);

  /* The product page CTA links here with ?model=… so the buyer does not
     retype the model they were just looking at. */
  const params = await searchParams.catch(() => ({}) as { model?: string });
  const preset = params.model ? String(params.model).slice(0, 160) : '';

  const phone = s.phone || '';
  const email = s.email || 'sales@badoudao.com';

  return (
    <>
      <TopBar />
      <Header />

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">Contact</div>
            <h1>Request a quotation</h1>
            <p className="sec-sub">
              Tell us the model, quantity and finish you need. All prices are
              Ex Works (factory) — freight and duties are quoted separately once
              we know your destination.
            </p>
          </div>
        </div>

        <section>
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Direct channels</div>
                <h2 style={{ fontSize: 28 }}>Reach us another way</h2>

                <div style={{ marginTop: 22, display: 'grid', gap: 18 }}>
                  <div>
                    <div className="help">Email</div>
                    <a href={`mailto:${email}`} style={{ fontSize: 16, fontWeight: 500 }}>
                      {email}
                    </a>
                  </div>

                  {phone && (
                    <div>
                      <div className="help">Phone / WhatsApp</div>
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                         style={{ fontSize: 16, fontWeight: 500 }}>
                        {phone}
                      </a>
                    </div>
                  )}

                  <div>
                    <div className="help">Response time</div>
                    <div style={{ fontSize: 15 }}>
                      Within {s.quoteHours || 12} hours on business days
                    </div>
                  </div>
                </div>

                <div className="note note-i" style={{ marginTop: 28 }}>
                  <strong>What to include for a fast quote.</strong> Target model
                  (or a reference photo), order quantity, dial and case finish,
                  logo method, and destination port. With those we can return a
                  firm Ex Works unit price and lead time in one reply.
                </div>

                <div className="note" style={{ marginTop: 16 }}>
                  <strong>MOQ {s.moq || 500} pcs.</strong> Small-batch and
                  pilot runs are welcome — above {s.capacityMin || 2000} pcs per
                  day we can absorb repeat orders without a second shift.
                </div>
              </div>

              <div id="inquiry">
                <InquiryForm products={products.slice(0, 9)} preset={preset} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}