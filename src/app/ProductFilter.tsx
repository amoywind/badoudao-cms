'use client';

/**
 * The filter bar on the catalogue page.
 *
 * The catalogue holds every product, and a buyer who wants a wooden
 * clock should not have to read past nine acrylic ones to find it. The
 * filter narrows the grid on the page rather than sending the buyer
 * somewhere else and back again, so the whole list stays one page.
 *
 * It filters by material, because material is what the catalogue is
 * organized by and every product has one. It does not filter by
 * movement: only some of the products carry a movement recorded, and a
 * filter that silently hides half the catalogue when a buyer picks an
 * option is worse than no filter at all.
 *
 * The material counts come from the database and are written on the
 * buttons, so a buyer can see what a filter will give them before they
 * press it.
 */

import { useMemo, useState } from 'react';
import { ProductCard, type GridProduct } from './ProductCard';

export type MaterialOption = {
  id: string;
  name: string;
  count: number;
};

export function ProductFilter({
  products,
  materials
}: {
  products: GridProduct[];
  materials: MaterialOption[];
}) {
  const [active, setActive] = useState<string>('all');

  /* The counts are taken from the list itself rather than from a second
     source, so a count cannot disagree with what the button does. */
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    for (const p of products) {
      c[p.category] = (c[p.category] || 0) + 1;
    }
    return c;
  }, [products]);

  const shown = useMemo(
    () => (active === 'all' ? products : products.filter((p) => p.category === active)),
    [products, active]
  );

  /* A material with nothing in it is not offered. The button would
     filter to an empty grid, which reads as a broken page. */
  const options = materials.filter((m) => (counts[m.id] || 0) > 0);

  if (options.length < 2) return null;

  return (
    <div className="pfilter">
      <div className="pfilter-row">
        <span className="pfilter-label" id="pfilter-label">
          Material
        </span>
        <div className="pfilter-tabs" role="group" aria-labelledby="pfilter-label">
          <button
            type="button"
            className={`pfilter-tab${active === 'all' ? ' on' : ''}`}
            aria-pressed={active === 'all'}
            onClick={() => setActive('all')}
          >
            All <span className="pfilter-n tnum">{counts.all}</span>
          </button>

          {options.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pfilter-tab${active === m.id ? ' on' : ''}`}
              aria-pressed={active === m.id}
              onClick={() => setActive(m.id)}
            >
              {m.name} <span className="pfilter-n tnum">{counts[m.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="pfilter-note" aria-live="polite">
        Showing {shown.length} of {products.length} models
        {active !== 'all' ? ` in ${options.find((m) => m.id === active)?.name}` : ''}.
      </p>

      {/* The grid the filter narrows. It is drawn here rather than on the
          server because the filtering happens in the browser: the whole
          catalogue is already on the page, and sending the buyer to a
          new URL to see a subset of what they were already looking at
          would make the browser's back button useless to them. */}
      <div className="pgrid" style={{ marginTop: 22 }}>
        {shown.map((p, i) => (
          <ProductCard key={p.id} p={p} priority={i === 0} />
        ))}
      </div>
    </div>
  );
}
