import Link from 'next/link';
import type { SiteSettings } from '@/lib/db';
import { listProducts, listCategories, getSettings, countProductsByCategory, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../../SiteChrome';
import { CategoryNav } from '../../CategoryNav';
import { InquiryCTA } from '../../InquiryForm';
import { TrustCards, Icons } from '../../TrustCards';
import { MATERIALS } from '@/lib/vocabulary';
import { SiteSchema } from '../../SiteSchema';
import { CollectionGrid } from '../../CollectionGrid';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/** One keyword per category page — the category name buyers actually type. */
export async function generateMetadata({ params }) {
  try {
    const cats = await listCategories().catch(() => []);
    const cat = cats.find((c) => c.id === params.category);
    if (!cat) return { title: 'Products | Badoudao', robots: { index: false } };

    const label = cat.name || cat.short || params.category;

    return buildMeta({
      title: `Wholesale ${label} — OEM Manufacturer | Badoudao`,
      description:
        `${cat.description || label} from Badoudao, China. ${cat.designs || ''} designs, MOQ from 300 pcs, Ex Works factory pricing, custom dial artwork available.`.replace(
          /\s+/g,
          ' '
        ),
      seoTitle: cat.seoTitle,
      seoDescription: cat.seoDescription,
      keywords: `${label.toLowerCase()} manufacturer, wholesale ${label.toLowerCase()}, OEM ${label.toLowerCase()}`,
      path: `/products/${params.category}`
    });
  } catch (err) {
    console.error('generateMetadata failed:', (err as Error)?.message);
    return {
      title: `${params.category} | Badoudao Quartz Clocks`,
      description: 'OEM and ODM quartz clocks from Badoudao, China. MOQ from 300 pieces, Ex Works pricing.'
    };
  }
}

export default async function CategoryPage({ params }) {
  const { category } = params;
  const cats = await listCategories().catch(() => []);
  const cat = cats.find((c) => c.id === category);
  const [products, s, counts] = await Promise.all([
    listProducts({ category, status: 'published' }).catch(() => []),
    getSettings().catch(() => ({} as SiteSettings)),
    countProductsByCategory().catch(() => ({} as Record<string, number>))
  ]);

  const title = cat ? `${cat.name} — wholesale & OEM manufacturer` : 'Products';

  /* The process names for this material, from the shared vocabulary. A
     category with no entry there — a new one the owner created in the
     admin — simply has no tags, which is right: the tags describe what
     the factory can do with that material, and a material nobody has
     written about yet has no process list to show. */
  const mat = MATERIALS.find((m) => m.slug === category);

  /* The collection page carries its own CollectionPage object on top of
     the site-wide graph: the collection's name and description, and the
     products it holds. The Organization and WebSite come from the
     shared component, so the company is described once and in one way. */
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat ? `${cat.name} wholesale` : 'Products',
    description: cat?.description,
    hasPart: products.map((p) => ({ '@type': 'Product', name: p.name, sku: p.id }))
  };

  return (
    <div className="site">

      <SiteSchema s={s} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/products">Products</Link><span>/</span>
          <span>{cat?.short || category}</span>
        </div>
      </nav>

      <main>
        <div className="page-head">
          <div className="wrap">
            <div className="sec-tag">{cat?.short} · Wholesale &amp; OEM</div>
            <h1>{title}</h1>
            <p className="sec-sub">
              {/* The description the owner wrote, as one block of body text.

                  It was already going out as the meta description and into
                  the schema, so the page and the search result were saying
                  different things about the same category.

                  No splitting on the first line. An earlier version treated
                  line one as a subheading and bolded it — so an owner who
                  wrote a single paragraph with no line break in it got the
                  whole paragraph rendered in bold, as a heading, with no
                  way to see that from the admin. Whatever shape the text
                  arrives in, it is displayed as the body copy it is.

                  The fallback covers a category whose description was never
                  filled in; that wording is unchanged from before. */}
              {(cat?.description || '').trim() || (
                <>
                  Looking for a {(cat?.short || category).toLowerCase()} supplier? Badoudao manufactures in-house
                  with MOQ from {s.moq || 300} pieces, custom dial artwork and retail-ready packaging.
                  Ex Works pricing shown — freight and duties quoted separately.
                </>
              )}
            </p>
          </div>
        </div>

        {/* ---- The material's craft tags and the category trust cards ---- */}
        <section style={{ padding: '48px 0 0' }}>
          <div className="wrap">
            {mat && (
              <div style={{ marginBottom: 28 }}>
                <div className="spec-h" style={{ marginBottom: 12 }}>Processes for this material</div>
                <div className="ctags">
                  {mat.tags.map((t) => <span className="ctag on" key={t}>{t}</span>)}
                </div>
              </div>
            )}

            <TrustCards
              items={[
                { value: String(s.moq || 300), unit: ' pcs', title: 'MOQ — mixed specs allowed', detail: 'Colours and specifications in one order', icon: Icons.box },
                { value: '100%', title: 'Silent sweep tested', detail: 'Every movement checked before packing', icon: Icons.clock },
                { value: '3', unit: ' yr', title: 'Movement warranty', detail: 'Factory assurance on the movement', icon: Icons.shield },
                { value: '24', unit: ' hours', title: 'Quote response', detail: 'With the 3D rendering', icon: Icons.spark }
              ]}
            />
          </div>
        </section>

        <section>
          <div className="wrap">
            {/* The category rail and the grid. The rail is a list of
                links to the other categories rather than a filter over
                this one — a category is a page with its own address,
                and a buyer who reaches one through a link can send it
                to a colleague. The grid is four columns on a desktop
                and two on a phone. */}
            <CollectionGrid
              activeCategory={category}
              categories={cats.map((c) => ({
                id: c.id,
                name: c.name || c.short || c.id,
                count: counts[c.id] ?? 0
              }))}
              products={products.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                category: p.category,
                summary: p.summary || '',
                priceMin: p.priceMin,
                priceMax: p.priceMax,
                moq: p.moq,
                leadTime: p.leadTime,
                image: p.images[0]?.thumbUrl || p.images[0]?.url || ''
              }))}
            />
          </div>
        </section>

        <section className="alt" id="inquiry">
          <div className="wrap">
            <div className="split" style={{ alignItems: 'start' }}>
              <div>
                <div className="sec-tag">Request a Quote</div>
                <h2 style={{ fontSize: 32 }}>Tell us what you need</h2>
                <p className="sec-sub">Send a reference photo or a sample. Quotation within {s.quoteHours || 4} hours.</p>
                {/* Each model page carries its own form, where a buyer has
                    already picked a product — no need for a second one here. */}
                <ul className="tick-list" style={{ marginTop: 22 }}>
                  <li>Choose a model above to request its exact price and lead time</li>
                  <li>Or send a reference and we will recommend the closest match</li>
                </ul>
              </div>
              <InquiryCTA label="Enquire about these clocks" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
        </div>

  );
}
