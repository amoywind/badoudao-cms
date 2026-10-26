'use client';

/**
 * The collection grid and its filter panel — §5.3-1.
 *
 * Three filter groups: material, movement type and size. The panel is on
 * the left and fixed, the grid on the right at four columns on a desktop
 * and two on a phone.
 *
 * The filtering happens here, on the client, rather than through a
 * query string. The catalogue is ten products; sending a round trip to
 * the database to remove two of them from a list the browser already
 * holds would make the panel slower than the thing it filters, and it
 * would put a filter state in the URL that a crawler would then have to
 * be taught not to index. The product array arrives with the page and
 * the panel works on it.
 *
 * The sizes are grouped the way a buyer says them — "a 12-inch clock" —
 * rather than by exact diameter, because nobody orders a 11.8-inch
 * clock. The groups are the specification's: 10, 12, 14, and 16 inches
 * and up.
 *
 * A product with no recorded size or movement is not in any of those
 * groups, and there is an "Unspecified" row for them, so a buyer can
 * see that the catalogue is not hiding anything rather than watching
 * products vanish when they tick a box.
 */

import { useMemo, useState } from 'react';

export type FilterProduct = {
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
  movementType: string | null;
  sizeInch: number | null;
};

const SIZE_GROUPS: { key: string; label: string; min: number; max: number }[] = [
  { key: '10', label: '10" (25cm)', min: 0, max: 11.5 },
  { key: '12', label: '12" (30cm)', min: 11.5, max: 13.5 },
  { key: '14', label: '14" (35cm)', min: 13.5, max: 16 },
  { key: '16', label: '16"+ (40cm+)', min: 16, max: 999 }
];

/* The specification lists four movement types for the filter. Pendulum
   is added because the catalogue actually has one, and a filter that
   omits a type the factory fits would hide a clock for no reason. */
const MOVEMENT_ORDER = [
  'Silent Sweep',
  'Step-Second',
  'Radio-Controlled',
  'Chime',
  'Digital',
  'Pendulum'
];

function sizeGroup(inch: number | null) {
  if (inch === null || inch === undefined) return 'unspecified';
  const g = SIZE_GROUPS.find((s) => inch >= s.min && inch < s.max);
  return g ? g.key : '16';
}

export function CollectionGrid({
  products,
  categories,
  activeCategory
}: {
  products: FilterProduct[];
  categories: { id: string; name: string; count: number }[];
  activeCategory?: string;
}) {
  const [material, setMaterial] = useState<string[]>(
    activeCategory ? [activeCategory] : []
  );
  const [movement, setMovement] = useState<string[]>([]);
  const [size, setSize] = useState<string[]>([]);

  /* Only the values that are actually present get a checkbox. A filter
     that offers "Radio-Controlled" on a catalogue with none of them
     is a dead end for the buyer and a lie about the range. */
  const movements = useMemo(() => {
    const present = new Set(products.map((p) => p.movementType).filter(Boolean) as string[]);
    const ordered = MOVEMENT_ORDER.filter((m) => present.has(m));
    /* Anything present that the order list does not know about still
       appears, at the end, rather than being unreachable. */
    const extra = [...present].filter((m) => !MOVEMENT_ORDER.includes(m));
    return [...ordered, ...extra];
  }, [products]);

  const sizes = useMemo(() => {
    const present = new Set(products.map((p) => sizeGroup(p.sizeInch)));
    return SIZE_GROUPS.filter((g) => present.has(g.key));
  }, [products]);

  const hasUnspecifiedMovement = products.some((p) => !p.movementType);
  const hasUnspecifiedSize = products.some((p) => p.sizeInch === null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (material.length && !material.includes(p.category)) return false;

      if (movement.length) {
        const key = p.movementType || 'unspecified';
        if (!movement.includes(key)) return false;
      }

      if (size.length) {
        const key = sizeGroup(p.sizeInch);
        if (!size.includes(key)) return false;
      }

      return true;
    });
  }, [products, material, movement, size]);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const active = material.length + movement.length + size.length;

  return (
    <div className="coll">
      <aside className="rail" aria-label="Product filters">
        <div className="rail-h">Filter</div>

        {active > 0 && (
          <button
            type="button"
            className="rail-clear"
            onClick={() => { setMaterial([]); setMovement([]); setSize([]); }}
          >
            Clear all ({active})
          </button>
        )}

        <div className="rail-grp">
          <div className="rail-l">Material</div>
          <div className="rail-opts">
            {categories.map((c) => (
              <label className="rail-opt" key={c.id}>
                <input
                  type="checkbox"
                  checked={material.includes(c.id)}
                  onChange={() => toggle(material, setMaterial, c.id)}
                />
                <span>{c.name}</span>
                <span className="rail-count">{c.count}</span>
              </label>
            ))}
          </div>
        </div>

        {movements.length > 0 && (
          <div className="rail-grp">
            <div className="rail-l">Movement</div>
            <div className="rail-opts">
              {movements.map((m) => (
                <label className="rail-opt" key={m}>
                  <input
                    type="checkbox"
                    checked={movement.includes(m)}
                    onChange={() => toggle(movement, setMovement, m)}
                  />
                  <span>{m}</span>
                </label>
              ))}
              {hasUnspecifiedMovement && (
                <label className="rail-opt">
                  <input
                    type="checkbox"
                    checked={movement.includes('unspecified')}
                    onChange={() => toggle(movement, setMovement, 'unspecified')}
                  />
                  <span>Not yet specified</span>
                </label>
              )}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="rail-grp">
            <div className="rail-l">Size</div>
            <div className="rail-opts">
              {sizes.map((g) => (
                <label className="rail-opt" key={g.key}>
                  <input
                    type="checkbox"
                    checked={size.includes(g.key)}
                    onChange={() => toggle(size, setSize, g.key)}
                  />
                  <span>{g.label}</span>
                </label>
              ))}
              {hasUnspecifiedSize && (
                <label className="rail-opt">
                  <input
                    type="checkbox"
                    checked={size.includes('unspecified')}
                    onChange={() => toggle(size, setSize, 'unspecified')}
                  />
                  <span>Not yet specified</span>
                </label>
              )}
            </div>
          </div>
        )}
      </aside>

      <div>
        {filtered.length === 0 ? (
          <div className="rail-empty">
            <p>No clocks match those filters.</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setMaterial([]); setMovement([]); setSize([]); }}
            >
              Clear the filters
            </button>
          </div>
        ) : (
          <>
            <div className="rail-count-row">
              {filtered.length} of {products.length} models
            </div>
            <div className="pgrid">
              {filtered.map((p, i) => (
                <a
                  key={p.id}
                  href={`/products/${p.category}/${p.slug}/`}
                  className="pcard"
                >
                  <div className="sq">
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.name}
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
                      <span style={{ marginLeft: 'auto' }}>MOQ {p.moq}</span>
                    </div>
                  </div>
                  <span className="trend-cta">Quick inquire →</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
