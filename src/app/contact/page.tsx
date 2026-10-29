/**
 * Dedicated contact page.
 *
 * The enquiry form is reachable from every page via the #inquiry anchor, but
 * a standalone /contact/ URL is what buyers and Google both look for — it
 * gives the conversion a keyword-matchable landing page ("contact", "get a
 * quote", "factory enquiry") instead of burying it below the fold on home.
 */
import type { SiteSettings } from '@/lib/db';
import { getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../SiteChrome';
import { InquiryForm } from '../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  let s: SiteSettings = {};
  try { s = await getSettings(); } catch {}

  const title = `Contact Badoudao | Get a Quotation for Wholesale Clocks`;
  const description = `Request a quotation for OEM and ODM quartz clocks from Badoudao. MOQ from ${s.moq || 300} pieces, Ex Works pricing, reply within ${s.quoteHours || 4} hours.`;

  /* buildMeta() rather than a hand-rolled object, so this route gets the
     absolute canonical and the siteUrl from settings like every other one.
     A relative canonical names no host at all, which is how a site ends up
     indexed twice under two domains. */
  return buildMeta({
    title,
    description,
    path: '/contact'
  });
}

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<{ model?: string; spec?: string; msg?: string }>;
}) {
  const [s] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings))
  ]);

  /* The product page CTA links here with ?model=… so the enquiry is
     attributed to the product the buyer was looking at, without a picker
     they have to operate. */
  const params = await searchParams.catch(() => ({}) as { model?: string; spec?: string; msg?: string });
  const preset = params.model ? String(params.model).slice(0, 160) : '';
  const spec = params.spec ? String(params.spec).slice(0, 120) : '';
  /* A configuration the buyer built on another page, brought here in
     the link. It goes in the box they can see, so that what they
     chose is in front of them and they can write around it. */
  const msg = params.msg ? String(params.msg).slice(0, 2000) : '';

  const phone = s.phone || '';
  const email = s.email || 'sales@badoudao.com';

  /* The number, in the two forms it is dialled in.

     A telephone link takes the number as it is written, with the plus
     and the spaces. A WhatsApp link takes the country code and the
     number with nothing else in it, because the address is a path and
     a path cannot carry a space. The 86 is China's code and the
     number already carries it, so it is only kept if it is not
     already there. */
  const telHref = phone.replace(/[^\d+]/g, '');
  const waDigits = phone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${waDigits.startsWith('86') ? waDigits : '86' + waDigits}`;

  return (
    <div className="site">

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

                {/* The two ways to reach a person.

                    They used to be one label reading "Phone /
                    WhatsApp" with the number under it, so a buyer who
                    wanted to send a message could not tell whether a
                    message was possible and had to guess. They are two
                    cards now, each carrying the mark that names it, and
                    the number can be dialled as well as messaged. */}
                <div className="ch-grid">
                  <a className="ch-card" href={`mailto:${email}`}>
                    <span className="ch-ic" aria-hidden="true">
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.9"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                    </span>
                    <span className="ch-body">
                      <span className="ch-lbl">Email</span>
                      <span className="ch-val">{email}</span>
                      <span className="ch-note">
                        Attach drawings or photos and they come with the reply.
                      </span>
                    </span>
                  </a>

                  {phone && (
                    <a className="ch-card" href={waUrl} target="_blank" rel="noopener noreferrer">
                      <span className="ch-ic ch-ic-wa" aria-hidden="true">
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.14.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8a9.8 9.8 0 0 1-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.43-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.89 9.89m8.41-18.3A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.15 1.59 5.95L0 24l6.34-1.65a11.87 11.87 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42" />
                        </svg>
                      </span>
                      <span className="ch-body">
                        <span className="ch-lbl">WhatsApp</span>
                        <span className="ch-val">{phone}</span>
                        <span className="ch-note">
                          The quickest way to send a photo or a question.
                        </span>
                      </span>
                    </a>
                  )}
                </div>

                {/* The number can be dialled as well as messaged.

                    It is a link of its own rather than a second action
                    inside the WhatsApp card: a link inside a link is
                    not a link, and a buyer who wants the number to dial
                    it should be able to copy it. */}
                {phone && (
                  <a className="ch-call" href={`tel:${telHref}`}>
                    <span className="ch-call-ic" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                      </svg>
                    </span>
                    Or call {phone}
                  </a>
                )}

                {/* The reply promise. It is not a channel — it is what
                    the buyer gets after using one — so it sits below
                    them rather than among them. */}
                <div className="ch-promise">
                  <span className="ch-ic ch-ic-plain" aria-hidden="true">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.9"
                      strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3.2 2" />
                    </svg>
                  </span>
                  <span className="ch-body">
                    <span className="ch-lbl">Response time</span>
                    <span className="ch-val">
                      Within {s.quoteHours || 4} hours on business days
                    </span>
                  </span>
                </div>

                <div className="note note-i" style={{ marginTop: 28 }}>
                  <strong>What to include for a fast quote.</strong> Target model
                  (or a reference photo), order quantity, dial and case finish,
                  logo method, and destination port. With those we can return a
                  firm Ex Works unit price and lead time in one reply.
                </div>

                <div className="note" style={{ marginTop: 16 }}>
                  <strong>MOQ {s.moq || 300} pcs.</strong> Small-batch and
                  pilot runs are welcome — above {s.capacityMin || 2000} pcs per
                  day we can absorb repeat orders without a second shift.
                </div>
              </div>

              <div id="inquiry">
                <InquiryForm preset={preset} spec={spec} msg={msg} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
        </div>

  );
}