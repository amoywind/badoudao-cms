/**
 * Trust cards — §4.2 of the specification.
 *
 * The pattern the specification describes, in one place so every page
 * uses the same markup: a number, a title, and one line of explanation.
 * The number is the hook, so it is the largest element and the only one
 * in the accent colour.
 *
 * The numbers on these cards are claims the factory makes to a buyer, and
 * a claim on a card is as binding as a claim in the copy. Every one of
 * them is therefore passed in rather than hard-coded, so a page cannot
 * quietly claim something the site does not say elsewhere.
 */

export type TrustItem = {
  /** The headline figure. A number, or a short phrase like "1,000+". */
  value: string;
  /** Optional unit rendered smaller and beside the number. */
  unit?: string;
  /** The label under the number. */
  title: string;
  /** One line of explanation. */
  detail?: string;
  /** A small icon. */
  icon?: React.ReactNode;
};

export function TrustCards({
  items,
  variant = 'card'
}: {
  items: TrustItem[];
  /** 'card' is the white bordered card; 'strip' is the dark bar. */
  variant?: 'card' | 'strip';
}) {
  if (!items.length) return null;

  return (
    <div className={`tcards${variant === 'strip' ? ' tcards-strip' : ''}`}>
      {items.map((it) => (
        <div className="tcard" key={it.title}>
          {it.icon && <div className="tcard-ico">{it.icon}</div>}
          <div className="tcard-n tnum">
            {it.value}
            {it.unit && <small>{it.unit}</small>}
          </div>
          <div className="tcard-t">{it.title}</div>
          {it.detail && <div className="tcard-d">{it.detail}</div>}
        </div>
      ))}
    </div>
  );
}

/* Icons, drawn rather than imported. A sprite sheet or an icon font would
   be another request for four small marks, and these are the only icons
   on the site. */

export const Icons = {
  clock: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  box: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  spark: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  shield: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  ruler: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 8l5-5 13 13-5 5L3 8z" />
      <path d="M7 6l2 2M10 4l2 2M13 7l2 2M5 9l2 2" />
    </svg>
  ),
  gear: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  ),
  play: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="currentColor" stroke="none" />
    </svg>
  ),
  chat: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M21 11.5a8 8 0 01-8.5 8 9 9 0 01-4-.9L3 21l1.5-4.5A8 8 0 1121 11.5z" />
    </svg>
  )
};
