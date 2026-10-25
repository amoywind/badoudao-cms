'use client';

/**
 * The three deep-dive tabs on a product page.
 *
 * Material and craft, the movement matrix, and packaging. The
 * specification says these replace one long block of text with three
 * things a buyer can open and close, because the three questions are not
 * asked together: somebody checking the carton does not need the movement
 * comparison, and somebody comparing movements does not need the carton.
 *
 * The tabs are buttons rather than links, and the state is held here
 * rather than in the URL. That is a deliberate trade: a link would let a
 * buyer send a colleague straight to the movement table, but it would also
 * put a query string on every product URL and a history entry on every
 * click, for a panel that is read once. The panels themselves are
 * rendered in the markup and hidden with CSS, so the content is in the
 * HTML for a crawler and for a buyer who has JavaScript switched off.
 */

import { useState } from 'react';

export type DetailTab = {
  key: string;
  label: string;
  /** Rendered as the panel body. */
  body: React.ReactNode;
};

export function DetailTabs({ tabs }: { tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? '');

  if (!tabs.length) return null;

  return (
    <div className="dtabs">
      <div className="dtab-nav" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={active === t.key}
            aria-controls={`panel-${t.key}`}
            className={`dtab-btn${active === t.key ? ' on' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`panel-${t.key}`}
          aria-labelledby={`tab-${t.key}`}
          className="dtab-body"
          /* The panels stay in the DOM. Hiding them with the hidden
             attribute rather than unmounting them means the content is
             in the HTML for a crawler, and a buyer without JavaScript
             sees all three rather than only the first. */
          hidden={active !== t.key}
        >
          {t.body}
        </div>
      ))}
    </div>
  );
}
