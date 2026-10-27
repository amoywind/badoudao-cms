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

/* Short codes for the specification string the factory reads.

   The options above are written for a buyer, in the words a buyer uses.
   The specification is a shorthand both sides can read back, so each
   value needs a code of its own — and the code has to be found from the
   word rather than written twice, or the two drift apart and a buyer
   asking for "Silent sweep" is sent a clock with a chime.

   A value that is not in the table falls back to a shortened form of
   its own, so a value the owner adds later still produces a code. */
const OPTION_CODES: Record<string, Record<string, string>> = {
  frame: {
    Plastic: 'PLAS',
    Metal: 'MTL',
    'MDF Wood': 'MDF',
    'Solid Wood': 'WOOD',
    Acrylic: 'ACR'
  },
  hands: {
    Metal: 'MTL',
    Wood: 'WOOD',
    Luminous: 'LUM',
    'Custom shape': 'CSTM'
  },
  dial: {
    Paper: 'PAPER',
    PVC: 'PVC',
    MDF: 'MDF',
    Glass: 'GLASS',
    Acrylic: 'ACR',
    Metal: 'MTL'
  },
  print: {
    'Silk screen': 'SILK',
    'UV printing': 'UV',
    'Laser engraving': 'LASER'
  },
  movement: {
    'Standard tick': 'TICK',
    'Silent sweep': 'SWEEP',
    'Radio controlled': 'RADIO',
    Luminous: 'LUM',
    Musical: 'MUSIC'
  },
  package: {
    'Closed box': 'CLOSED',
    'Mail-order box': 'MAIL',
    'Open display box': 'OPEN',
    'Custom colour box': 'COLOUR'
  }
};

/* The code for a group, used as the segment that names it. */
export const GROUP_CODES: Record<string, string> = {
  frame: 'FRM',
  hands: 'HND',
  dial: 'DIAL',
  print: 'PRT',
  movement: 'MOV',
  package: 'PKG'
};

/** The short code for one value of one group. */
export function codeFor(groupKey: string, value: string): string {
  const known = OPTION_CODES[groupKey]?.[value];
  if (known) return known;
  /* An unknown value still gets a code: the letters of the word, upper
     case, without the punctuation, cut to eight characters. */
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'STD'
  );
}

/* The four packaging options, kept as data because the packaging section
   explains the catalogue rather than one product's choices.

   Names only. An earlier version carried two paragraphs per box — the
   board, the foam, the drop test, the MOQ on the print run — and the
   pictures say all of it: a buyer looking at the kraft box is being told
   what the kraft box is. Written out beside the photograph it read as
   duplication, and a claim written beside its own photo is a claim that
   can fall out of step with the photo.

   title is the packing name a buyer uses when specifying an order. image is
   a media id under folder = 'packaging'; a missing one falls back to the
   drawn outline, so a missing picture is a placeholder rather than a
   broken image. upload-packaging.js writes the rows. */
export const PACKAGING_OPTIONS = [
  {
    key: 'closed',
    title: 'Closed box',
    image: 'img_250ecfa3dbaa2cb3908c9534'
  },
  {
    key: 'pizza',
    title: 'Pizza box',
    image: 'img_80df9ff030608586e96bb5c2'
  },
  {
    key: 'display',
    title: 'Open display box',
    image: 'img_06012a4a562a1159577986c3'
  },
  {
    key: 'color',
    title: 'Colour box',
    image: 'img_ef2a1d96934f692adf68d460'
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

/* A tag from the admin: managed, so its destination is editable. */
export type ManagedTag = {
  key: string;
  label: string;
  href: string;
  scope: string;
  scopeValue: string | null;
};

/**
 * Tags for one product.
 *
 * The owner's tags come first and win: if the admin says a product carries
 * "MDF Wood", the generated one for the same attribute is dropped rather
 * than shown twice. Only when the catalogue is empty — a fresh install, or
 * nobody has set any tags up yet — does this fall back to deriving them
 * from the spec rows, so a new product is never tagless while the tags are
 * still being written.
 */
export function seoTagsFor(
  p: {
    category: string;
    specs: { label: string; value: string }[];
    moveLevel?: string | null;
  },
  managed: ManagedTag[] = []
): SeoTag[] {
  const tags: SeoTag[] = [];

  if (managed.length) {
    for (const t of managed) {
      /* scope = 'category' only applies to the product's own category.
         A tag scoped to metal-clocks on a wooden clock is a link to the
         wrong thing, which is worse than no link. */
      if (t.scope === 'category' && t.scopeValue && t.scopeValue !== p.category) continue;
      tags.push({ label: t.label, href: t.href });
    }
    return tags;
  }

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
    mdf: { label: 'MDF Wood', href: '/products/wood-wall-clocks' },
    'solid wood': { label: 'Solid Wood', href: '/products/wood-wall-clocks' },
    oak: { label: 'Solid Oak', href: '/products/wood-wall-clocks' },
    metal: { label: 'Metal', href: '/products/metal-wall-clocks' },
    brass: { label: 'Brass Finish', href: '/products/metal-wall-clocks' },
    plastic: { label: 'Plastic', href: '/products/plastic-wall-clocks' },
    acrylic: { label: 'Acrylic', href: '/products/acrylic-wall-clocks' },
    glass: { label: 'Glass', href: '/products/glass-crystal-wall-clocks' },
    resin: { label: 'Resin', href: '/products/resin-wall-clocks' }
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