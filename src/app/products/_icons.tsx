'use client';

import type { GroupIcon } from '@/lib/product-detail';

/**
 * The six customisation-group icons, drawn as inline SVG.
 *
 * Separate from product-detail.ts because that file is a .ts and this is
 * JSX. They are strokes rather than emoji: emoji render differently per
 * platform and sit on a coloured square, which does not match the outlined
 * icons used elsewhere on the site. These are 1.6px strokes in a 24-box, so
 * they sit alongside the existing icon set at the same weight.
 */
export function GroupGlyph({ name }: { name: GroupIcon }) {
  const P = {
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  const paths: Record<GroupIcon, React.ReactNode> = {
    /* A square frame seen head on, with the dial inside it. */
    frame: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <circle cx="12" cy="12" r="4.2" />
      </>
    ),
    /* Two hands from the centre, at the ten-and-two a product photo shows. */
    hands: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 6.6V12l3.6 2.4" {...P} />
      </>
    ),
    /* A dial plate with tick marks around the edge. */
    dial: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 5.6v2M12 16.4v2M5.6 12h2M16.4 12h2" {...P} />
        <circle cx="12" cy="12" r="1.1" />
      </>
    ),
    /* A print head over a surface. */
    print: (
      <>
        <path d="M7 8V3.6h10V8" />
        <rect x="3.6" y="8" width="16.8" height="7.5" rx="1.5" />
        <path d="M7 14h10v6.4H7z" />
      </>
    ),
    /* A movement: the gear and its pinion. */
    movement: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.4v2.4M12 18.2v2.4M3.4 12h2.4M18.2 12h2.4M5.9 5.9l1.7 1.7M16.4 16.4l1.7 1.7M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7" {...P} />
      </>
    ),
    /* A carton, closed, seen three-quarter. */
    package: (
      <>
        <path d="M3.6 7.6L12 3.4l8.4 4.2v8.8L12 20.6l-8.4-4.2z" />
        <path d="M3.6 7.6L12 11.8l8.4-4.2M12 11.8v8.8" {...P} />
      </>
    )
  };

  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.frame}
    </svg>
  );
}