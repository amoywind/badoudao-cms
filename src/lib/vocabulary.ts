/**
 * The site's manufacturing vocabulary.
 *
 * One file so the home page, the custom-services page and the components
 * page cannot disagree about what the factory offers. The two earlier
 * versions of this content were written separately and drifted: the
 * material list on the home page said five materials while the category
 * tree had six, and the movement list on the components page named a
 * movement the factory does not fit.
 *
 * The craft tags per material are the ones the specification lists in
 * §7.2. They are the process names a buyer uses to narrow a search, so
 * they belong with the category rather than with the copy.
 */

export type CraftTag = {
  slug: string;
  name: string;
  /** Short line under the category name on the home page. */
  blurb: string;
  /** The process names, as the specification gives them. */
  tags: string[];
};

/** Keyed by the category id in the database, so the two cannot drift. */
export const MATERIALS: CraftTag[] = [
  {
    slug: 'plastic-wall-clocks',
    name: 'Plastic Wall Clocks',
    blurb:
      'Injection-moulded ABS and PP, from classic office dials to wood-grain water-transfer finishes.',
    tags: ['Custom mold creation', 'Pantone color matching', '3D injection relief']
  },
  {
    slug: 'wood-wall-clocks',
    name: 'Wood Wall Clocks',
    blurb:
      'FSC-certified oak, walnut and bamboo, CNC-engraved and finished in natural wood-wax oil.',
    tags: ['Solid wood / bamboo', 'CNC engraving', 'Natural wood-wax oil', 'Mortise & tenon']
  },
  {
    slug: 'metal-wall-clocks',
    name: 'Metal Wall Clocks',
    blurb:
      'Laser-cut and welded metal, from moving-gear mechanisms to multi-layer dimensional dials.',
    tags: ['Laser cutting', 'Multi-layer 3D dial', 'Moving gear mechanism', 'Anodized / powder coated']
  },
  {
    slug: 'acrylic-wall-clocks',
    name: 'Acrylic Wall Clocks',
    blurb:
      '3–10mm PMMA with backside UV printing and diamond-polished edges, built to survive parcel networks.',
    tags: ['3-10mm thick acrylic', 'Backside UV printing', 'Diamond edge polishing']
  },
  {
    slug: 'glass-crystal-wall-clocks',
    name: 'Glass & Crystal Wall Clocks',
    blurb:
      'Tempered glass and crystal porcelain with HD UV printing and heat-melted glaze sealing.',
    tags: ['Tempered shatterproof glass', 'Beveled edge cut', 'Crystal porcelain heat-melt']
  },
  {
    slug: 'resin-wall-clocks',
    name: 'Resin Wall Clocks',
    blurb:
      'Polyresin and epoxy river clocks, hand-painted and cast from 3D-scanned originals.',
    tags: ['Epoxy resin river', 'Hand-painted detailing', '3D concrete/sandstone texture']
  }
];

/** The four highlighted shells, §5.1. */
export const TRENDING = [
  {
    slug: 'wood-wall-clocks',
    title: 'Dual-sided corner clock',
    note: 'Two dials, one body. The shape that fills a corner of a room and nothing else does.',
    tags: ['Double-sided', 'Mortise & tenon', 'MOQ 300']
  },
  {
    slug: 'metal-wall-clocks',
    title: 'Exposed gear wall clock',
    note: 'Moving gear mechanism driven by the same quartz movement, visible through the frame.',
    tags: ['Moving gear', 'Powder coated', 'MOQ 300']
  },
  {
    slug: 'acrylic-wall-clocks',
    title: 'Acrylic swinging-tail clock',
    note: 'Cut acrylic with a swinging tail, the novelty format that sells hardest online.',
    tags: ['Acrylic cut', 'Backside UV print', 'MOQ 300']
  },
  {
    slug: 'resin-wall-clocks',
    title: 'Epoxy resin river clock',
    note: 'Cast resin with a resin river base, hand-painted and filled in a single pour.',
    tags: ['Epoxy river', 'Hand painted', 'MOQ 300']
  }
];

/** The seven movements, §9.2. */
export const MOVEMENTS = [
  {
    name: 'Step-second quartz',
    drive: 'Quartz drive, the second hand jumps once a second',
    db: '< 30 dB',
    scene: 'Offices, kitchens, the volume seller'
  },
  {
    name: 'Silent sweep quartz',
    drive: 'Quartz drive, the second hand sweeps without a tick',
    db: '< 10 dB',
    scene: 'Bedrooms, hotel rooms, premium homeware'
  },
  {
    name: 'Chime',
    drive: 'Hourly and half-hourly electronic or mechanical chime',
    db: 'Audible, adjustable',
    scene: 'European classic styles, traditional homeware'
  },
  {
    name: 'Mechanical',
    drive: 'Spring-driven mechanical movement, no battery',
    db: 'Mechanical escapement',
    scene: 'Enthusiast buyers, vintage luxury pieces'
  },
  {
    name: 'Radio-controlled',
    drive: 'Receives WWVB / DCF77 / JJY / BPC and sets itself',
    db: 'Silent or sweep',
    scene: 'US, Europe, Japan, China — no manual setting'
  },
  {
    name: 'Music chime',
    drive: 'Plays a built-in chip or music-box tune on the hour',
    db: 'Melodic',
    scene: 'Gift clocks, children’s clocks, seasonal editions'
  },
  {
    name: 'Pendulum',
    drive: 'Quartz-driven decorative pendulum, or a mechanical escapement',
    db: 'Varies by style',
    scene: 'Living-room focal clocks, vintage hall clocks'
  }
];

/** The two electronic displays, §9.3. */
export const DISPLAYS = [
  {
    name: 'LCD calendar',
    detail:
      'Liquid crystal, calculating month lengths and leap years on its own. Shows time, date, weekday and indoor temperature and humidity.'
  },
  {
    name: 'LED digital',
    detail:
      'High-brightness numeric or dot-matrix display in red, green, blue, white or warm white, with a night mode. Mains powered.'
  }
];

/** The six structural components, §6.1. */
export const ANATOMY = [
  {
    n: '1',
    name: 'Frame',
    detail:
      'Plastic, wood, metal, acrylic or resin. Spray painting, electroplating, brushing and antique-brass finishes.'
  },
  {
    n: '2',
    name: 'Backplate',
    detail:
      'Moulded plastic or metal, with custom hanging holes and laser-printed brand logo and SKU on the reverse.'
  },
  {
    n: '3',
    name: 'Hands',
    detail:
      '1,000+ shapes in aluminium, brass, wood, acrylic and plastic, with glow-in-the-dark and Pantone matching.'
  },
  {
    n: '4',
    name: 'Movement',
    detail:
      'Seven quartz and mechanical movements, from silent sweep to chime, or one of the two electronic displays.'
  },
  {
    n: '5',
    name: 'Dial',
    detail:
      'Copper paper, plastic, metal, wood or glass. Full-colour UV printing, silk screen, photo dials, 3D relief.'
  },
  {
    n: '6',
    name: 'Lens cover',
    detail:
      'Glass or acrylic, flat or domed, with anti-reflective and shatter-resistant options.'
  }
];

/** The simplified structures, §6.2. */
export const SIMPLIFIED = [
  {
    name: 'Open-face — no dial, no cover',
    detail: 'Engraved solid-wood panels and laser-cut metal shapes, where the mechanism is the design.'
  },
  {
    name: 'No frame, no cover',
    detail: 'Printed transparent acrylic and cast resin art pieces, where the material carries the image.'
  },
  {
    name: 'Electronics instead of a movement',
    detail: 'LCD perpetual calendars and LED digital displays, where the display replaces the dial entirely.'
  }
];

/** The four QC steps, §10.2. */
export const QC_STEPS = [
  {
    n: 'Step 01',
    title: 'Raw material QC',
    detail: 'Moisture content testing on timber, scratch and impact testing on plastic and acrylic.'
  },
  {
    n: 'Step 02',
    title: '24-hour aging QC',
    detail: '100% of movements run under power for 24 hours. Accuracy verified and the tick measured with a sound meter.'
  },
  {
    n: 'Step 03',
    title: 'Pointer balance & alignment',
    detail: 'Hand straightness and balance torque checked on every hand set, so the sweep never catches.'
  },
  {
    n: 'Step 04',
    title: '1.2m drop-test packaging',
    detail: 'International parcel handling simulated — a six-sided drop test from 1.2 metres on the packed carton.'
  }
];
