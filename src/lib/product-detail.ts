/**
 * Customisation groups, shown on a product page.
 *
 * The six groups are the same across the catalogue because they are what a
 * buyer specifies on an order. What differs is which values apply to a
 * given model: a wooden wall clock has no acrylic frame, and listing one
 * anyway costs a question in the reply.
 *
 * So the groups live here, and product_customisations records the
 * selections per product. The owner ticks them in the admin; the page
 * renders whatever is ticked. A group with nothing ticked is not shown —
 * an empty "Frame" heading with no options under it reads as a broken
 * section rather than as an absent one.
 */

/* Inline SVG rather than emoji. Emoji render differently per platform and
   sit on a coloured square, which does not match the outlined icons used
   elsewhere on the site; these are stroked to match at 1.6px. */
export type GroupIcon =
  | 'frame' | 'hands' | 'dial' | 'print' | 'movement' | 'package';

export type OptionGroup = {
  key: string;
  icon: GroupIcon;
  label: string;
  values: string[];
};

export const OPTION_GROUPS: OptionGroup[] = [
  {
    key: 'frame',
    icon: 'frame',
    label: 'Frame',
    values: ['Plastic', 'Metal', 'MDF Wood', 'Solid Wood', 'Acrylic']
  },
  {
    key: 'hands',
    icon: 'hands',
    label: 'Clock hands',
    values: ['Metal', 'Wood', 'Luminous', 'Custom shape']
  },
  {
    key: 'dial',
    icon: 'dial',
    label: 'Dial plate',
    values: ['Paper', 'PVC', 'MDF', 'Glass', 'Acrylic', 'Metal']
  },
  {
    key: 'print',
    icon: 'print',
    label: 'Logo printing',
    values: ['Silk screen', 'UV printing', 'Laser engraving']
  },
  {
    key: 'movement',
    icon: 'movement',
    label: 'Movement',
    values: ['Standard tick', 'Silent sweep', 'Radio controlled', 'Luminous', 'Musical']
  },
  {
    key: 'package',
    icon: 'package',
    label: 'Packaging',
    values: ['Closed box', 'Mail-order box', 'Open display box', 'Custom colour box']
  }
];

/* The four packaging options, kept as data because the packaging section
   explains the catalogue rather than one product's choices. Each says what
   it is for: a buyer choosing packaging is choosing a unit cost and a
   sales channel, not a look. */
export const PACKAGING_OPTIONS = [
  {
    key: 'closed',
    title: 'Closed box',
    note: 'Plain white carton, printed label only. The lowest cost per unit and the default for bulk shipments.',
    fit: 'Wholesale orders, containers'
  },
  {
    key: 'pizza',
    title: 'Pizza / mail-order box',
    note: 'Reinforced two-layer board with corner protection, passed drop testing for courier handling.',
    fit: 'E-commerce, single-item shipping'
  },
  {
    key: 'display',
    title: 'Open display box',
    note: 'Clear PET window so the dial reads without unpacking. Needs a printed header card.',
    fit: 'Retail shelves, gift sets'
  },
  {
    key: 'color',
    title: 'Custom colour box',
    note: 'Full-colour litho print to your artwork. The print run has its own MOQ, separate from the clock quantity.',
    fit: 'Brand retail, marketplaces'
  }
];

/* The four OEM/ODM steps. Timings are ours: 7–10 days is the sample lead
   the settings page quotes, and production follows the per-quantity bands
   stated across the site. */
export const PROCESS_STEPS = [
  {
    n: '1',
    title: 'Submit artwork & specs',
    note: 'A reference photo, a sketch or a competitor sample is enough to quote. We confirm feasibility and cost.'
  },
  {
    n: '2',
    title: 'Sampling',
    note: '7–10 days for a custom sample, including artwork proofing and one revision round.'
  },
  {
    n: '3',
    title: 'Mass production',
    note: '7 days for 50–500 pcs, 20 days for 500+. Daily capacity 2,000 pcs per shift.'
  },
  {
    n: '4',
    title: 'QC & inspection',
    note: 'IQC, IPQC, FQC and OQC against the approved sample, with photos before dispatch.'
  }
];

/* QC claims, phrased as what the buyer can hold us to rather than as
   adjectives. Each links to the page that substantiates it. */
export const QC_CLAIMS = [
  { label: '±1s/day', note: 'movement accuracy', href: '/p/quality' },
  { label: '<20dB', note: 'silent sweep', href: '/p/quality' },
  { label: '72h', note: 'powered ageing test', href: '/p/quality' },
  { label: 'CE / RoHS', note: 'movement certified', href: '/p/certification' }
];

/* ------------------------------------------------------------------
   SEO tags
   ------------------------------------------------------------------ */

/* A tag is an attribute a buyer would search for — "silent sweep", "MDF"
   — rendered as a link to the page collecting everything with that
   attribute. A tag with no destination is a keyword, not a link, and the
   internal linking it was meant to create does not happen. */
export type SeoTag = { label: string; href: string };

export function seoTagsFor(p: {
  category: string;
  specs: { label: string; value: string }[];
  moveLevel?: string | null;
}): SeoTag[] {
  const tags: SeoTag[] = [];

  /* Movement first: it decides whether a clock suits a bedroom or a shop,
     and it is what most B2B searches name. */
  const movement = (p.moveLevel || '').toLowerCase();
  const MOVEMENT_LINKS: [RegExp, SeoTag][] = [
    [/silent/, { label: 'Silent Sweep', href: '/products?q=silent+sweep' }],
    [/radio/, { label: 'Radio Controlled', href: '/products?q=radio+controlled' }],
    [/luminous/, { label: 'Luminous Hands', href: '/products?q=luminous' }],
    [/musical/, { label: 'Musical', href: '/products?q=musical' }]
  ];
  for (const [re, tag] of MOVEMENT_LINKS) {
    if (re.test(movement)) tags.push(tag);
  }

  /* Material, read off the specs rather than hard-coded per model: the spec
     rows are already written per product, and duplicating them into a tag
     list is a second place for them to disagree. */
  const MATERIAL_LINKS: Record<string, SeoTag> = {
    mdf: { label: 'MDF Wood', href: '/products/wood-clocks' },
    'solid wood': { label: 'Solid Wood', href: '/products/wood-clocks' },
    oak: { label: 'Solid Oak', href: '/products/wood-clocks' },
    metal: { label: 'Metal', href: '/products/metal-clocks' },
    brass: { label: 'Brass Finish', href: '/products/metal-clocks' },
    plastic: { label: 'Plastic', href: '/products/wall-clocks' },
    acrylic: { label: 'Acrylic', href: '/products/wall-clocks' },
    glass: { label: 'Glass', href: '/products/wall-clocks' },
    resin: { label: 'Resin', href: '/products/metal-clocks' }
  };

  for (const s of p.specs) {
    const v = String(s.value || '').toLowerCase();
    for (const [needle, tag] of Object.entries(MATERIAL_LINKS)) {
      if (v.includes(needle) && !tags.some((t) => t.label === tag.label)) {
        tags.push(tag);
      }
    }
  }

  /* Dimensions are searchable and specific: "12 inch wall clock" is a real
     query, and a tag that says so is worth more than a material synonym. */
  const dim = p.specs.find((s) => /size|diameter|dimension/i.test(s.label));
  if (dim) {
    const inch = String(dim.value).match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
    if (inch) {
      tags.push({ label: `${inch[1]} inch`, href: `/products?q=${inch[1]}+inch` });
    }
  }

  /* Cap it. A wall of twenty tags is a wall of nothing in particular. */
  return tags.slice(0, 8);
}