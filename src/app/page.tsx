import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import {
  listCategories, getSettings, buildMeta, siteVideoMap, listProducts
} from '@/lib/db';
import type { SiteVideoSlot } from '@/lib/db';
import { TopBar, Header, Footer } from './SiteChrome';
import { InquiryForm } from './InquiryForm';
import { TrustCards, Icons } from './TrustCards';
import { LiveClock } from './LiveClock';
import { MATERIALS, FACTORY_SHOTS } from '@/lib/vocabulary';
import { VideoSlot, VideoSlotHydrator } from './VideoSlot';
import { SiteSchema } from './SiteSchema';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Home page metadata.
 *
 * Carries the numbers a buyer filters on — MOQ, capacity, response time,
 * price basis — because those are the terms the query contains, and a
 * description that restates them is what earns the click.
 */
export async function generateMetadata() {
  const s = await getSettings().catch(() => ({} as SiteSettings));

  return buildMeta({
    title: 'Quartz Clock Manufacturer China — OEM & ODM Wholesale | Badoudao',
    description:
      `OEM and ODM quartz clocks from a China factory. Wall clocks, alarm clocks, desk clocks and clock movements. MOQ from ${s.moq || 300} pcs, ${s.capacityMin || 2000} pcs daily capacity, Ex Works pricing, CE and RoHS movements. Quotation within ${s.quoteHours || 4} hours.`,
    keywords:
      'quartz clock manufacturer, OEM clock factory, wholesale wall clocks, China clock supplier, custom quartz clocks',
    path: '/',
    image: '/hero-clocks.jpg'
  });
}

export default async function HomePage() {
  /* The site videos are fetched with everything else rather than in a
     second round trip. The table is nine rows, so the query is cheap and
     the alternative is a waterfall on the slowest page on the site. */
  /* Four platforms worth looking at, and the three pages that answer
     the questions a buyer asks before they can pick one.

     The featured products are taken from the database rather than
     written out here, so a product that is added, repriced or taken
     off the shelf changes this row on its own. */
  const [cats, s, videos, featured, all] = await Promise.all([
    listCategories().catch(() => []),
    getSettings().catch(() => ({} as SiteSettings)),
    siteVideoMap().catch(() => ({} as Record<string, SiteVideoSlot>)),
    listProducts({ featured: 1, status: 'published' }).catch(() => []),
    listProducts({ status: 'published' }).catch(() => [])
  ]);

  /* One clock from each of the six material families, so the row sits
     directly under the material grid and reads as the same set of
     materials with an actual clock against each one.

     The grid itself is tied to the material grid's rules, so the cards
     are the same width as the cards above them. Four of them in a
     six-column grid would have left two empty columns at the end of the
     row and a gap in the middle of the page for no reason. */
  const picks: typeof featured = [];
  for (const m of MATERIALS) {
    const inFamily = featured.filter((p) => p.category === m.slug);
    if (inFamily.length > 0) {
      picks.push(inFamily[0]);
      continue;
    }
    /* A family with nothing flagged as featured still gets a clock —
       the row is one of each material, and a material with no clock in
       it would leave a hole in the row of families. */
    const any = all.find((p) => p.category === m.slug);
    if (any) picks.push(any);
  }

  const moq = Number(s.moq) || 300;

  /* The material cards need each category's cover photo and product count.
     The vocabulary file holds the process tags; the database holds the
     picture and the number. Joining them here rather than in either place
     is what keeps the two from drifting. */
  const mats = MATERIALS.map((m) => {
    const c = cats.find((x) => x.id === m.slug);
    return { ...m, image: c?.imageThumbUrl || c?.imageUrl || '', count: c?.productCount ?? 0 };
  });

  return (
    <div className="site">

      <SiteSchema s={s} />
      <TopBar />
      <Header />

      <main id="main">
        {/* ---- Hero: value proposition + live clock ---- */}
        <section className="hero2">
          <div className="wrap hero2-grid">
            <div>
              <div className="eyebrow">
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#5DCAA5' }} />
                OEM / ODM B2B production facility
              </div>
              <h1 className="hero2-h1">
                Agile OEM wall clock manufacturing
                <br />
                <span className="hero2-hl">for modern global brands</span>
              </h1>
              <p className="lede">
                Built for interior decor brands, corporate gifting and marketplace sellers.
                Low MOQ {moq} pcs, drop-tested packaging, and 1,000+ clock hand
                customisations — quoted in {s.quoteHours || 4} hours.
              </p>
              <div className="hero-btns">
                <a href="#inquiry" className="btn btn-primary">Build a custom inquiry</a>
                <Link href="/products" className="btn btn-ghost">View base platforms</Link>
              </div>
              <p className="hero-note">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg>
                Movements are CE and RoHS compliant · Certification arranged on request
              </p>
            </div>
            <LiveClock />
          </div>
        </section>

        {/* ---- Trust strip ---- */}
        <div className="tcards-strip">
          <div className="wrap">
            <TrustCards
              variant="strip"
              items={[
                { value: String(moq), unit: ' pcs', title: 'Flexible low MOQ', detail: 'Mixed colours and specs in one order', icon: Icons.box },
                { value: '24', unit: ' hours', title: 'Fast 3D rendering', detail: 'Photorealistic mockups before you commit', icon: Icons.spark },
                { value: '7', unit: ' days', title: 'Express sampling', detail: 'Physical sample shipped after approval', icon: Icons.clock },
                { value: '1.2', unit: 'm drop', title: 'Certified packaging', detail: 'ISTA-1A tested for e-commerce shipping', icon: Icons.shield }
              ]}
            />
          </div>
        </div>

        {/* ---- Material matrix ---- */}
        <section id="materials">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// 6 core materials</div>
              <h2>Six material families, one factory</h2>
              <p className="sec-sub">
                Every category is available with custom dials, logos, hands and packaging.
                Prices shown are <strong>estimated Ex Works (factory) prices</strong> at MOQ {moq} —
                freight and duties quoted separately.
              </p>
            </div>

            <div className="mat-grid">
              {mats.map((m) => (
                <Link key={m.slug} href={`/products/${m.slug}`} className="mat-card">
                  <div className="sq">
                    {m.image && (
                      <img
                        src={m.image}
                        alt={m.name}
                        loading="lazy"
                        decoding="async"
                        width={600}
                        height={600}
                      />
                    )}
                  </div>
                  <div className="mat-body">
                    <h3>{m.name}</h3>
                    <p>{m.blurb}</p>
                    {/* One tag, not two.

                        A card is a sixth of the page wide, so two tags
                        share a hundred and seventy pixels between
                        them and each is cut to six characters. One tag
                        fits whole, and the space for it is reserved
                        whether it wraps or not so that the six cards
                        end at the same place. The full list is on the
                        category page. */}
                    <div className="ctags mat-tags">
                      {m.tags.slice(0, 1).map((t) => (
                        <span className="ctag" key={t}>{t}</span>
                      ))}
                    </div>
                    <div className="mat-foot">
                      <span><b>{m.count}</b> designs</span>
                      <span className="exw">MOQ {moq} pcs</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Featured platforms ----

            Four products with their price and their SKU on the card, so a
            buyer can judge the range without opening the catalogue. These
            come from the database: the picture, the price and the link
            are whatever the product record says today.

            This is not the catalogue. The material grid above is the
            catalogue, organised by material, and it lists everything.
            This row is a shortlist of four things worth a look — which is
            why it is four and not every product. */}
        {picks.length > 0 && (
          <section id="featured">
            <div className="wrap">
              <div className="sec-head">
                <div className="sec-tag">// Featured platforms</div>
                <h2>One clock from each of the six materials</h2>
                <p className="sec-sub">
                  Prices are estimated Ex Works figures at MOQ {moq}. Every one of
                  them can be put into production with a different dial, hand set and
                  carton.
                </p>
              </div>

              <div className="feat-grid">
                {picks.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.category}/${p.slug}`}
                    className="feat-card"
                  >
                    <div className="sq">
                      {p.images.length > 0 && (
                        <img
                          src={p.images[0].thumbUrl || p.images[0].url}
                          alt={p.name}
                          width={600}
                          height={600}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <div className="feat-body">
                      <span className="feat-sku tnum">{p.id}</span>
                      <h3>{p.name}</h3>
                      <div className="feat-price tnum">
                        ${p.priceMin.toFixed(2)} &ndash; ${p.priceMax.toFixed(2)}
                      </div>
                      <span className="exw">View details →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- The three questions ----

            A buyer who has not decided anything yet does not need a
            product. They need to know what can be changed, what goes
            inside the clock, and how it is checked. Each of those has a
            page of its own, and this is the signpost to them. */}
        <section className="alt">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Before you choose</div>
              <h2>Three things worth understanding first</h2>
              <p className="sec-sub">
                Most enquiries arrive before a buyer knows which clock they
                want. These three pages answer the questions that come
                first, whichever product they end up choosing.
              </p>
            </div>

            <div className="grid-3">
              {[
                {
                  icon: Icons.box,
                  title: 'What you can change',
                  body:
                    'A clock is six parts. The exploded view shows all six and what each one tolerates — so a buyer can say "change this" and mean something.',
                  href: '/custom-services',
                  cta: 'See the six components'
                },
                {
                  icon: Icons.gear,
                  title: 'What goes inside it',
                  body:
                    'More than 1,000 hand styles and seven movements, each with its noise level, drift and battery life written out.',
                  href: '/components',
                  cta: 'Open the components studio'
                },
                {
                  icon: Icons.shield,
                  title: 'How it is checked',
                  body:
                    'The four gates every clock passes, with the figures for each one and footage of the test floor.',
                  href: '/craft-qc',
                  cta: 'See the QC protocol'
                }
              ].map((t) => (
                <Link key={t.title} href={t.href} className="card" style={{ padding: 26 }}>
                  <div className="tcard-ico">{t.icon}</div>
                  <h3 style={{ fontSize: 16.5, marginBottom: 9 }}>{t.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 14 }}>
                    {t.body}
                  </p>
                  <span className="exw">{t.cta} →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Factory capability ---- */}
        <section className="alt" id="capability">
          <div className="wrap split">
            <div>
              <div className="sec-tag">// Manufacturing</div>
              <h2>Everything happens under one roof</h2>
              <p className="sec-sub">
                From moulding to finished box. Keeping the whole process in-house means
                faster sampling, tighter tolerances and no surprises between you and
                the factory.
              </p>
              <div className="cap-list">
                {[
                  ['Tooling & in-house moulding', 'New tooling in 15–25 days, no subcontractor margin.'],
                  ['Surface finishing', 'UV spray, electroplating, brushed and antique brass effects, hand-painting.'],
                  ['Assembly & movement sourcing', 'Domestic and imported movements — you choose the accuracy-to-cost point.'],
                  ['Four-stage QC', 'IQC, IPQC, FQC and OQC. Every carton checked before it leaves.'],
                  ['Retail-ready packaging', 'Colour boxes, window boxes and gift sets designed to survive ocean freight.']
                ].map(([h, p], i) => (
                  <div className="cap" key={h}>
                    <div className="cap-n">0{i + 1}</div>
                    <div><h4>{h}</h4><p>{p}</p></div>
                  </div>
                ))}
              </div>
              <div className="certs">
                <span className="cert">CE &amp; RoHS movements</span>
                <span className="cert">QC: IQC / IPQC / FQC / OQC</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 14, lineHeight: 1.6 }}>
                Quartz clocks themselves carry no mandatory certification requirement.{' '}
                <Link href="/p/certification" style={{ textDecoration: 'underline' }}>Read the full compliance note</Link>
              </p>
            </div>
            <div className="hero-img">
              <img
                src="/workshop-floor.jpg"
                alt="Our assembly floor: staff fitting dials and movements before packing"
                width={1400}
                height={933}
                srcSet="/workshop-floor-720.jpg 720w, /workshop-floor.jpg 1400w"
                sizes="(max-width: 900px) 92vw, 46vw"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* ---- Process ---- */}
        <section id="process">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// OEM / ODM process</div>
              <h2>From your idea to a shipped container</h2>
            </div>
            <div className="proc">
              {[
                ['Send your brief', 'A reference photo, a sample or a sketch is enough to start.'],
                ['Quotation', `Within ${s.quoteHours || 4} hours with pricing broken down by tooling, unit, packaging and freight.`],
                ['Sample', `${s.sampleDays || '5-7'} business days. Sample cost is credited against your first bulk order.`],
                ['Bulk production', '20–45 days depending on complexity, with photo and video updates.'],
                ['Delivery', 'Ex Works by default. CIF or DDP available on request.']
              ].map(([h, p], i) => (
                <div className="proc-i" key={h}>
                  <span className="proc-n">STEP 0{i + 1}</span>
                  <h4>{h}</h4><p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Factory live shorts ---- */}
        <section className="alt" id="factory-live">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-tag">// Factory live</div>
              <h2>The floor, not the brochure</h2>
              <p className="sec-sub">
                Four stages of the QC process, filmed in the building. Each clip is
                vertical because that is the format the process reads in.
              </p>
            </div>

            {/* The four factory clips. Each one is a slot in the admin,
                and a slot with no video yet falls back to the label that
                says what it is waiting for — the placeholders name the
                shot rather than showing a broken player. */}
            <div className="qc-grid">
              {FACTORY_SHOTS.map(([t, d], i) => (
                <div className="qc-item" key={t}>
                  <VideoSlot
                    youtubeId={videos[`home-factory-${i + 1}`]?.youtubeId || ''}
                    title={t}
                    caption={`${t} — 9:16 factory footage`}
                  />
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- RFQ ---- */}
        <section id="inquiry" className="alt">
          <div className="wrap">
            <div className="sec-head sec-head-narrow">
              <div className="sec-tag">// Direct factory RFQ</div>
              <h2>Tell us what you need built</h2>
              <p className="sec-sub">
                Send a reference photo, a sample or just a rough idea. You will get a
                quotation and a 3D rendering within {s.quoteHours || 4} hours — no obligation.
              </p>
            </div>
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                {/* The trust figures are not repeated here. The same
                    four numbers — MOQ, 3D rendering, sampling, drop
                    test — sit in the bar directly under the hero, and
                    saying them a second time six blocks down does not
                    make a buyer trust the factory more; it makes the
                    page look like it has four things to say. */}
                <div className="certs">
                  <span className="cert">MOQ from {moq} pcs</span>
                  <span className="cert">Samples in {s.sampleDays || '5-7'} business days</span>
                  <span className="cert">Ex Works pricing</span>
                </div>
              </div>
              <div>
                <InquiryForm replyHours={Number(s.quoteHours) || 4} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* The play-button handler. It is a script rather than a client
          component because the pages that hold videos are server
          components, and making them client components to accommodate
          a button would ship the whole page's data to the browser. */}
      <VideoSlotHydrator />
    </div>
  );
}
