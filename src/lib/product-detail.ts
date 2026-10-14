/**
 * Customisation groups and SEO tags for a product page.
 *
 * The six option groups are the same on every model — frame, hands, dial
 * plate, printing, movement, packaging — because they are what a buyer
 * specifies on an order, and a list that changed per product would make two
 * pages impossible to compare. What varies is which values apply to a
 * given model: a wooden wall clock has no acrylic frame, and offering one
 * anyway costs a question in the reply.
 *
 * Kept in code rather than in product_options because product_options is a
 * flat label list with a price delta and no grouping, and because these are
 * catalogue-wide facts rather than per-order data. A buyer chooses from
 * them while reading, not while ordering.
 *
 * The tags are the material and movement attributes as links. They go to
 * the category page that covers the attribute, which is the internal
 * linking a B2B site wants: a page about MDF wood clocks links to other MDF
 * wood clocks, and the pages it links to are pages with the same shape.
 */

/* A value that no product in the range actually offers is worse than a
   short list — it invites a buyer to ask for something the factory does
   not do. `only` narrows a group to the categories it applies to. */
export type OptionGroup = {
  key: string;
  icon: string;
  label: string;
  /* Category ids this group applies to. Absent means all of them. */
  only?: string[];
  values: string[];
};

export const OPTION_GROUPS: OptionGroup[] = [
  {
    key: 'frame',
    icon: '🖼',
    label: 'Frame',
    values: ['Plastic', 'Metal', 'MDF Wood', 'Solid Wood', 'Acrylic']
  },
  {
    key: 'hands',
    icon: '📍',
    label: 'Clock hands',
    values: ['Metal', 'Wood', 'Luminous', 'Custom shape']
  },
  {
    key: 'dial',
    icon: '🎨',
    label: 'Dial plate',
    values: ['Paper', 'PVC', 'MDF', 'Glass', 'Acrylic', 'Metal']
  },
  {
    key: 'printing',
    icon: '🖨',
    label: 'Logo printing',
    values: ['Silk screen', 'UV printing', 'Laser engraving']
  },
  {
    key: 'movement',
    icon: '⚙️',
    label: 'Movement',
    values: ['Standard tick', 'Silent sweep', 'Radio controlled', 'Luminous', 'Musical']
  },
  {
    key: 'packaging',
    icon: '📦',
    label: 'Packaging',
    values: ['Closed box', 'Mail-order box', 'Open display box', 'Custom colour box']
  }
];

/* QC claims, phrased as what the buyer can hold us to rather than as
   adjectives. Each links to the quality page that substantiates it. */
export const QC_CLAIMS = [
  { label: '±1s/day', note: 'movement accuracy', href: '/p/quality' },
  { label: '<20dB', note: 'silent sweep', href: '/p/quality' },
  { label: '72h', note: 'powered ageing test', href: '/p/quality' },
  { label: 'CE / RoHS', note: 'movement certified', href: '/p/certification' }
];

/* The four standard packaging options. Each says what it is for, because a
   buyer choosing packaging is choosing a cost and a shelf, not a look. */
export const PACKAGING_OPTIONS = [
  {
    key: 'closed',
    title: 'Closed box',
    note: 'Plain white carton, printed label only. The lowest cost per unit and the default for bulk shipments.',
    fit: 'Best for: wholesale orders, containers'
  },
  {
    key: 'pizza',
    title: 'Pizza / mail-order box',
    note: 'Reinforced two-layer board with corner protection, passed drop testing for courier handling.',
    fit: 'Best for: e-commerce, single-item shipping'
  },
  {
    key: 'display',
    title: 'Open display box',
    note: 'Clear PET window so the dial reads without unpacking. Needs a printed header card.',
    fit: 'Best for: retail shelves, gift sets'
  },
  {
    key: 'color',
    title: 'Custom colour box',
    note: 'Full-colour litho print to your artwork. MOQ applies per print run, not per clock.',
    fit: 'Best for: brand retail, marketplaces'
  }
];

/* The four OEM/ODM steps. Timings are ours: 7–10 days is the sample lead
   the settings page already quotes, and production runs on the per-quantity
   bands the site states everywhere else. */
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

/* Questions a buyer asks before the first order. Kept to four: the ones
   that decide whether to enquire at all. */
export const FAQS = [
  {
    q: 'How long does a custom sample take?',
    a: '7–10 days from artwork approval, including one revision round. Stock models can ship in 1–2 days if you already have the sample or accept ours.'
  },
  {
    q: 'How long does bulk production take?',
    a: '7 days for orders of 50–500 pieces, 20 days for 500 and above. Lead time is counted from the day the deposit and final artwork arrive, not from the enquiry.'
  },
  {
    q: 'What is covered by the movement warranty?',
    a: 'Movements carry CE and RoHS. Against batch quantities over 1,000 pieces we replace faulty movements free; below that, the usual route is a replacement batch in the next shipment.'
  },
  {
    q: 'Can you produce to my own design?',
    a: 'Yes, ODM is the larger half of what we do. Send a sketch or a reference and we return a 3D render with tooling cost before anything is committed. Tooling is a one-off; unit price drops from the second order.'
  }
];

/* ------------------------------------------------------------------
   SEO tags
   ------------------------------------------------------------------ */

/* A tag is an attribute a buyer would search for — "silent sweep", "MDF"
   — rendered as a link to the page that collects everything with that
   attribute. A tag with no destination is a keyword, not a link, and the
   internal linking it was meant to create does not happen. */
export type SeoTag = { label: string; href: string };

export function seoTagsFor(p: {
  category: string;
  specs: { label: string; value: string }[];
  moveLevel?: string | null;
}): SeoTag[] {
  const tags: SeoTag[] = [];

  /* Movement first: it is the attribute that decides whether a clock suits
     a bedroom or a shop, and it is what most B2B searches name. */
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

  /* Dimensions are searchable and specific: "12 inch wall clock" is a
     real query, and a tag that says so is worth more than another
     material synonym. */
  const dim = p.specs.find((s) => /size|diameter|dimension/i.test(s.label));
  if (dim) {
    const inch = String(dim.value).match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
    if (inch) {
      tags.push({
        label: `${inch[1]} inch`,
        href: `/products?q=${inch[1]}+inch`
      });
    }
  }

  /* Cap it. A wall of twenty tags is a wall of nothing in particular. */
  return tags.slice(0, 8);
}