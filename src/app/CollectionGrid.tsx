import Link from 'next/link';

/**
 * The collection grid and its category rail.
 *
 * The rail is a list of links, not a filter panel.
 *
 * It was a filter panel with three groups — material, movement and
 * size — and the material group ticked the current category. Two
 * things were wrong with that.
 *
 * The first was that a category is a place, not a condition. Ticking a
 * box in a sidebar filters the list in front of you; clicking the
 * category's name takes you to that category's own page, with its own
 * address, its own heading and its own set of products. The second is
 * what the owner asked for, and the first is why it is the better
 * arrangement: a category a buyer reaches through a filter is a state
 * that disappears when they share the link, and a category they reach
 * through a link is a page they can send to a colleague.
 *
 * The movement and size filters are gone. They filtered the ten
 * products on screen without changing the address, so a buyer who
 * narrowed the list could not send anyone the narrowed list — and half
 * the catalogue had no movement or diameter recorded, which put those
 * products in an "unspecified" bucket that looked like a defect rather
 * than like missing paperwork.
 *
 * This is a server component. There is no state to hold and nothing to
 * hydrate, so the page ships less JavaScript than it did.
 */

export type GridProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  priceMin: number;
  priceMax: number;
  moq: number;
  leadTime: string;
  image: string;
};

export function CollectionGrid({
  products,
  categories,
  activeCategory
}: {
  products: GridProduct[];
  categories: { id: string; name: string; count: number }[];
  activeCategory?: string;
}) {
  return (
    <div className="coll">
      {/* The category list, as navigation rather than as a control.
          It is an aside with a nav inside it, so a screen reader can
          skip past it to the products, and the heading says what it
          is. */}
      <aside className="rail" aria-label="Product categories">
        <div className="rail-h">Categories</div>

        <nav>
          <ul className="rail-links">
            <li>
              <Link
                href="/products/"
                className={`rail-link${!activeCategory ? ' on' : ''}`}
                aria-current={!activeCategory ? 'page' : undefined}
              >
                <span>All products</span>
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products/${c.id}/`}
                  className={`rail-link${activeCategory === c.id ? ' on' : ''}`}
                  aria-current={activeCategory === c.id ? 'page' : undefined}
                >
                  <span>{c.name}</span>
                  <span className="rail-count">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* The counts are worth keeping: "Metal Wall Clock (3)" tells a
            buyer whether that branch is worth opening, and a category
            with nothing in it says so rather than inviting a click
            that leads to an empty grid. */}
        <div className="rail-foot">
          {products.length} {products.length === 1 ? 'model' : 'models'} in this
          category
        </div>
      </aside>

      <div>
        <div className="rail-count-row">
          {products.length} {products.length === 1 ? 'model' : 'models'}
        </div>

        {products.length === 0 ? (
          <div className="rail-empty">
            <p>No models in this category yet. Ask us for the one you want — most of
              what we make is not in the catalogue.</p>
            <Link href="/contact/" className="btn btn-ghost btn-sm">
              Send a requirement
            </Link>
          </div>
        ) : (
          <div className="pgrid">
            {products.map((p, i) => (
              <Link
                key={p.id}
                href={`/products/${p.category}/${p.slug}/`}
                className="pcard"
              >
                <div className="sq">
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.name}
                      width={600}
                      height={600}
                      decoding="async"
                      {...(i === 0 ? { fetchpriority: 'high' } : { loading: 'lazy' })}
                    />
                  )}
                </div>
                <div className="pcard-body">
                  <h3>{p.name}</h3>
                  {p.summary && (
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 10 }}>
                      {p.summary.slice(0, 110)}…
                    </p>
                  )}
                  <div className="pcard-price">
                    <span>Est. EXW</span>
                    <b>${p.priceMin.toFixed(2)}</b>
                    <span>– ${p.priceMax.toFixed(2)}</span>
                    <span className="pcard-moq">MOQ {p.moq}</span>
                  </div>
                </div>
                <span className="trend-cta">Quick inquire →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
