import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { notFound } from 'next/navigation';
import { one, getSettings, listCategories, buildMeta } from '@/lib/db';
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

  const [s, cats] = await Promise.all([
    getSettings().catch(() => ({} as SiteSettings)),
    listCategories().catch(() => [])
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
            {/* Quality puts the licence beside its text rather than below:
                a buyer checking whether a factory is real is reading this
                page for exactly that, so the evidence belongs at hand. */}
            <div className={page.slug === 'quality' ? 'quality-layout' : undefined}>
              <div className="content-block" dangerouslySetInnerHTML={{ __html: page.body }} />
              {page.slug === 'quality' && <LicencePanel />}
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
