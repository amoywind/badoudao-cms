import Link from 'next/link';

/**
 * One catalogue card, used by every grid on the site.
 *
 * The all-products page, the category pages and the filtered view all
 * draw the same card. They had three copies of it, and the copies had
 * drifted — one of them was showing pictures a third larger than the
 * others. One definition, one size, everywhere.
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

export function ProductCard({
  p,
  priority = false
}: {
  p: GridProduct;
  /* The first card on a page is the one most likely to be seen, and it
     should not wait for the lazy loader to fetch it. */
  priority?: boolean;
}) {
  return (
    <Link href={`/products/${p.category}/${p.slug}/`} className="pcard">
      <div className="sq">
        {p.image && (
          <img
            src={p.image}
            alt={p.name}
            width={600}
            height={600}
            decoding="async"
            {...(priority ? { fetchpriority: 'high' } : { loading: 'lazy' })}
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
    </Link>
  );
}
