import Link from 'next/link';
import type { Category } from '@/lib/db';

/**
 * The category list, as a sidebar beside a product grid.
 *
 * A buyer landing on /products has eight categories and one grid. Without
 * this they scroll a wall of cards guessing whether what they want is in
 * it; with it they can see the whole range at once and jump. The counts
 * matter as much as the names — "Metal Clocks (14)" tells a buyer whether
 * that branch is worth opening, and a category with nothing in it says so
 * rather than inviting a click that leads to an empty grid.
 *
 * Rendered as a <nav> inside an <aside>: it is navigation, not content, so
 * a screen reader can skip past it, and the heading makes that explicit.
 *
 * Current category is marked with aria-current, and the whole list is
 * inside one nav landmark rather than eight links scattered in a sidebar.
 */
export function CategoryNav({
  cats,
  current,
  counts,
  heading = 'Product Categories'
}: {
  cats: Category[];
  current?: string;
  /* Product count per category id. Absent means unknown, not zero. */
  counts?: Record<string, number>;
  heading?: string;
}) {
  if (!cats.length) return null;

  return (
    <aside className="cat-nav" aria-label={heading}>
      <h2 className="cat-nav-h">{heading}</h2>

      <nav>
        <ul>
          <li>
            <Link
              href="/products"
              className={!current ? 'on' : undefined}
              {...(!current ? { 'aria-current': 'page' as const } : {})}
            >
              <span className="cat-nav-n">All products</span>
            </Link>
          </li>

          {cats.map((c) => {
            const on = c.id === current;
            const n = counts?.[c.id];
            return (
              <li key={c.id}>
                <Link
                  href={`/products/${c.id}`}
                  className={on ? 'on' : undefined}
                  {...(on ? { 'aria-current': 'page' as const } : {})}
                >
                  <span className="cat-nav-n">{c.name || c.short || c.id}</span>
                  {n !== undefined && (
                    <span className="cat-nav-c" title={`${n} ${n === 1 ? 'model' : 'models'}`}>
                      {n}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="cat-nav-note">
        Not seeing what you need?{' '}
        <a href="/contact#inquiry">Send a reference</a> and we will quote it.
      </p>
    </aside>
  );
}