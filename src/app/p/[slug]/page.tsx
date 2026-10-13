import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { notFound } from 'next/navigation';
import { one, getSettings, listCategories, countProductsByCategory, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../../SiteChrome';
import { InquiryCTA } from '../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Per-page metadata.
 *
 * The route segment is called [slug] but the lookup is by id. Every page
 * that existed before had id = slug, which hid the difference; a row
 * inserted with only a slug renders a 404 while sitting in the table
 * looking correct. Pages created through the admin follow the same rule, so
 * this stays until the two are unified deliberately — changing one side
 * alone breaks every existing URL.
 *
 * The pages table has carried seo_title and seo_description from the start,
 * but nothing ever read them — the admin could fill them in and watch the
 * page title stay unchanged. They are wired up here, with a generated
 * fallback so a page with no override still gets its own title.
 */
export async function generateMetadata({ params }) {
  const page = await one(
    "SELECT * FROM pages WHERE id = ? AND status = 'published'",
    params.slug
  ).catch(() => null);

  if (!page) return { title: 'Badoudao', robots: { index: false } };

  const heading = page.heading || page.title;

  return buildMeta({
    title: `${heading} | Badoudao Quartz Clock Manufacturer`,
    description:
      page.seo_description ||
      page.intro ||
      `${heading} — from Badoudao, an OEM and ODM quartz clock manufacturer. MOQ from 500 pieces, Ex Works pricing.`,
    seoTitle: page.seo_title,
    seoDescription: page.seo_description,
    path: `/p/${page.slug || params.slug}`
  });
}

export default async function StaticPage({ params }) {
  const page = await one(
    "SELECT * FROM pages WHERE id = ? AND status = 'published'",
    params.slug
  ).catch(() => null);

  if (!page) notFound();

  const [s, cats, counts] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings)),
    listCategories().catch(() => []),
    countProductsByCategory().catch(() => ({} as Record<string, number>))
  ]);

  return (
    <>
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <span>{page.heading || page.title}</span>
        </div>
      </nav>

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">{page.title}</div>
            <h1>{page.heading || page.title}</h1>
            {page.intro && <p className="sec-sub">{page.intro}</p>}
          </div>
        </div>

        {/* Factory shows the showroom panorama; quality carries the
            business licence. Both sit outside the markdown body because
            they need layout the content field cannot express. */}
        {page.slug === 'factory' && <ShowroomStrip />}

        <section>
          <div className="wrap">
            {/* Body and rail side by side.

                The body keeps its 760px measure — a 1400px line of text is
                unreadable, and that limit is the point. The problem was
                what sat beside it: nothing, so half the screen was empty on
                a page whose whole job is to be read.

                Quality already had a rail, for the licence. Every other
                page gets the same slot with what a buyer is actually
                looking for alongside the prose: the product range to go
                to next, and the numbers that decide whether to enquire.

                Below 1024px the rail drops below the text — a 300px column
                beside a 700px one is not readable on a tablet, and
                stacking costs nothing since the text comes first either
                way. */}
            <div className="page-layout">
              <div className="content-block" dangerouslySetInnerHTML={{ __html: page.body }} />

              {page.slug === 'quality' ? (
                <LicencePanel />
              ) : (
                <PageRail slug={page.slug} categories={cats} counts={counts} moq={s.moq} quoteHours={s.quoteHours} />
              )}
            </div>
          </div>
        </section>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 30 }}>Ready to talk numbers?</h2>
                <p className="sec-sub">
                  Send your requirement. We reply within {s.quoteHours || 12} hours
                  with a breakdown of tooling, unit price, packaging and freight.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
                  {cats.map((c) => (
                    <Link key={c.id} href={`/products/${c.id}/`} className="badge badge-brand">
                      {c.short || c.name}
                    </Link>
                  ))}
                </div>
              </div>
              {/* Readers arrived to read, not to enquire — a banner that
                  links onward interrupts far less than a full form. */}
              <InquiryCTA label="Ready to order?" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/**
 * The showroom, as one wide strip.
 *
 * Kept out of the markdown body on purpose: layout in a content field is
 * something the admin editor can break, and this image needs to be a
 * full-bleed strip rather than a block of text.
 *
 * The six source photos were the same room from six angles, so they are
 * stitched into one panorama here. A grid of them reads as six unrelated
 * listings; a strip reads as a room you could walk down.
 *
 * The source video is not embedded. It is a 720 MB phone upload, and no
 * buyer on a phone connection can be made to wait for that.
 */
function ShowroomStrip() {
  return (
    <section className="alt">
      <div className="wrap">
        <div className="sec-tag">Showroom</div>
        <h2 style={{ fontSize: 30 }}>Our own showroom</h2>
        <p className="sec-sub">
          Every series we manufacture is on display. If you want to see a
          specific one before ordering, tell us which and we will show you
          when you visit.
        </p>

        <figure className="showroom-strip">
          <img
            src="/media/factory/showroom-banner.jpg"
            alt="Panorama of our showroom, showing clock displays across six shelving units"
            width={1600}
            height={350}
            loading="lazy"
          />
        </figure>
      </div>
    </section>
  );
}

/**
 * The column beside a content page.
 *
 * The body is capped at 760px because a 1400px line is unreadable, and
 * that cap left half the screen empty. Filling it with a second copy of
 * the page's own text would be worse, so the rail carries what a buyer
 * reaches for while reading: the range to go to next, and the two or three
 * numbers that decide whether to enquire.
 *
 * What it shows depends on the page. Quality gets the licence instead —
 * evidence that the factory is real belongs beside the inspection
 * description rather than under a list of product categories.
 */
function PageRail({
  slug,
  categories,
  counts,
  moq,
  quoteHours
}: {
  slug: string;
  categories: { id: string; name: string; designs?: string }[];
  counts?: Record<string, number>;
  moq?: string | number;
  quoteHours?: string | number;
}) {
  /* The numbers that matter differ by page: a buyer reading about small
     batches is deciding on quantity, one reading the factory is deciding
     on whether to trust us, one reading OEM/ODM is deciding on scope. */
  const FACTS: Record<string, { label: string; value: string }[]> = {
    'oem-odm': [
      { label: 'MOQ from', value: `${moq || 500} pcs` },
      { label: 'Sample lead time', value: '1 day' },
      { label: 'Production', value: '7–20 days' },
      { label: 'NDA', value: 'Available' }
    ],
    'small-batch': [
      { label: 'MOQ from', value: `${moq || 500} pcs` },
      { label: 'Samples', value: '1–2 pcs' },
      { label: 'Sample fee', value: 'Refunded on bulk' },
      { label: 'Pricing', value: 'Ex Works' }
    ],
    factory: [
      { label: 'Daily capacity', value: '2,000 pcs' },
      { label: 'Established', value: 'Dec 2023' },
      { label: 'Product series', value: '8' },
      { label: 'Movements', value: 'CE / RoHS' }
    ]
  };

  const facts = FACTS[slug];
  const list = (categories || []).filter((c) => counts?.[c.id]);

  return (
    <aside className="page-rail">
      {facts && (
        <div className="rail-block">
          <h2>Key figures</h2>
          <dl>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {list.length > 0 && (
        <div className="rail-block">
          <h2>Product range</h2>
          <ul>
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/products/${c.id}`}>
                  <span>{c.name}</span>
                  <b>{counts![c.id]}</b>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/products" className="rail-all">
            All products →
          </Link>
        </div>
      )}

      <div className="rail-block">
        <h2>Next step</h2>
        <p>
          Send a reference, a sample or a sketch. A quotation comes back
          within {quoteHours || 12} hours with no obligation.
        </p>
        <Link href="/#inquiry" className="btn btn-primary btn-sm rail-cta">
          Request a Quote
        </Link>
      </div>
    </aside>
  );
}

/**
 * The business licence, on the quality page.
 *
 * Placed next to the inspection content rather than on the factory page:
 * a licence answers "is this a real company" and a quality page is where a
 * buyer doing due diligence already is. Shown small with a link to full
 * size, so the page does not open on a document.
 */
function LicencePanel() {
  return (
    <aside className="licence">
      <div className="licence-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" />
        </svg>
        <span>Business Licence</span>
      </div>
      <a href="/media/factory/business-license.jpg" target="_blank" rel="noopener noreferrer">
        <img src="/media/factory/business-license.jpg"
          alt="Xiamen Orange Cat Creative Home Co., Ltd. business licence, click to view full size"
          width={1000} height={750} loading="lazy" />
      </a>
      <p>
        Xiamen Orange Cat Creative Home Co., Ltd. Click the image for the
        full-size licence.
      </p>
    </aside>
  );
}
