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

        {/* Only the factory page gets the showroom wall and the licence.
            A manufacturing licence on a buyer's screen is the fastest
            possible answer to "are you a real factory" — the page has no
            other way to show it. */}
        {page.slug === 'factory' && <FactoryGallery />}

        <section>
          <div className="wrap">
            <div className="content-block" dangerouslySetInnerHTML={{ __html: page.body }} />
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
 * Showroom, workshop and business licence.
 *
 * Kept out of the markdown body on purpose. These are the only images that
 * have to be laid out rather than stacked, and putting layout HTML in the
 * content field would mean the admin editor could break it.
 *
 * The video is not embedded. It is 720 MB — the phone upload, not a web
 * master — and a buyer on a phone connection cannot be made to wait for it.
 * Stills from it carry the same information and load in a third of a second.
 */
function FactoryGallery() {
  const showroom = [
    { src: '/media/factory/showroom-a.jpg', alt: 'Showroom wall — plastic and metal wall clocks' },
    { src: '/media/factory/showroom-b.jpg', alt: 'Showroom — wood and decorative clocks' },
    { src: '/media/factory/showroom-c.jpg', alt: 'Showroom — gold rim and pastel clocks' },
    { src: '/media/factory/showroom-e.jpg', alt: 'Showroom — illuminated LCD wall clocks' },
    { src: '/media/factory/showroom-f.jpg', alt: 'Showroom — black metal frame clocks' },
    { src: '/media/factory/showroom-h.jpg', alt: 'Showroom — square and vintage dial clocks' }
  ];

  const workshop = [
    { src: '/media/factory/workshop-1.jpg', alt: 'Production floor — clock bodies and packaging stacks' },
    { src: '/media/factory/workshop-2.jpg', alt: 'Assembly line — staff fitting dials and movements' },
    { src: '/media/factory/workshop-3.jpg', alt: 'Workbench — clock case assembly in progress' }
  ];

  return (
    <>
      <section className="alt">
        <div className="wrap">
          <div className="sec-tag">Showroom</div>
          <h2 style={{ fontSize: 30 }}>Our own showroom</h2>
          <p className="sec-sub">
            Every series we manufacture is on display. If you want to see a
            specific one before ordering, tell us which and we will show you
            when you visit.
          </p>

          {/* One wide strip rather than a grid: the six photos are the same
              room from different angles, and a strip reads as a room while
              a grid reads as six unrelated listings. */}
          <figure className="showroom-strip">
            <img
              src="/media/factory/showroom-banner.jpg"
              alt="Panorama of our showroom, showing clock displays across six shelving units"
              width={1600}
              height={350}
              loading="lazy"
            />
          </figure>

          <div className="showroom-grid">
            {showroom.map((s) => (
              <figure key={s.src}>
                <img src={s.src} alt={s.alt} width={900} height={675} loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-tag">Production</div>
          <h2 style={{ fontSize: 30 }}>On our own floor</h2>
          <p className="sec-sub">
            Design, structural engineering, sampling, assembly and packing all
            happen in the same building. No third-party factory, no broker
            between us and the product.
          </p>

          <div className="split" style={{ alignItems: 'start', marginTop: 26 }}>
            <div>
              <div className="shop-grid">
                {workshop.map((s) => (
                  <figure key={s.src}>
                    <img src={s.src} alt={s.alt} width={1000} height={750} loading="lazy" />
                  </figure>
                ))}
              </div>
            </div>

            {/* The licence is the single strongest trust signal a factory
                page can carry. Shown small with a link to the full image
                so the page does not open on a document. */}
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
                  alt="Xiamen Orange Cat Creative Home Co., Ltd. business licence — click to view full size"
                  width={1000} height={750} loading="lazy" />
              </a>
              <p>
                Xiamen Orange Cat Creative Home Co., Ltd. — click the image
                for the full-size licence.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
