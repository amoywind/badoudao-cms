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
  /** The tolerance the raw material is held to, with its figure.

      A material without a number is a material a buyer has to take on
      trust. These are the measurements the factory checks, written on
      the same bar as the price so a buyer can read one against the
      other. */
  tolerance: string;
};

/** Keyed by the category id in the database, so the two cannot drift. */
export const MATERIALS: CraftTag[] = [
  {
    slug: 'plastic-wall-clocks',
    name: 'Plastic Wall Clocks',
    blurb:
      'Injection-moulded ABS and PP, from classic office dials to wood-grain water-transfer finishes.',
    tags: ['Custom mold creation', 'Pantone color matching', '3D injection relief'],
    tolerance: 'High-impact injection moulding · Pantone colour matched'
  },
  {
    slug: 'wood-wall-clocks',
    name: 'Wood Wall Clocks',
    blurb:
      'FSC-certified oak, walnut and bamboo, CNC-engraved and finished in natural wood-wax oil.',
    tags: ['Solid wood / bamboo', 'CNC engraving', 'Natural wood-wax oil', 'Mortise & tenon'],
    tolerance: 'Moisture content held at 8–12%'
  },
  {
    slug: 'metal-wall-clocks',
    name: 'Metal Wall Clocks',
    blurb:
      'Laser-cut and welded metal, from moving-gear mechanisms to multi-layer dimensional dials.',
    tags: ['Laser cutting', 'Multi-layer 3D dial', 'Moving gear mechanism', 'Anodized / powder coated'],
    tolerance: 'Laser cut to ±0.1mm'
  },
  {
    slug: 'acrylic-wall-clocks',
    name: 'Acrylic Wall Clocks',
    blurb:
      '3–10 mm PMMA with the print on the reverse and diamond-polished edges, built to survive parcel networks.',
    tags: ['3-10mm thick acrylic', 'Backside UV printing', 'Diamond edge polishing'],
    tolerance: 'PMMA, printed in reverse for a depth effect'
  },
  {
    slug: 'glass-crystal-wall-clocks',
    name: 'Glass & Crystal Wall Clocks',
    blurb:
      'Tempered glass and crystal porcelain with HD UV printing and heat-melted glaze sealing.',
    tags: ['Tempered shatterproof glass', 'Beveled edge cut', 'Crystal porcelain heat-melt'],
    tolerance: '4mm tempered, edges bevelled'
  },
  {
    slug: 'resin-wall-clocks',
    name: 'Resin Wall Clocks',
    blurb:
      'Polyresin and epoxy, hand-painted and cast from 3D-scanned originals.',
    tags: ['Epoxy resin river', 'Hand-painted detailing', '3D concrete/sandstone texture'],
    tolerance: 'Vacuum-degassed, cast against the live edge'
  },
  {
    /* Marble.

       What the factory can actually do with it, stated plainly: it is a
       hard, natural, veined stone, so it is cut rather than moulded and
       every piece differs. That difference is the selling point and
       also the constraint, and a buyer planning a range needs to know
       both — no two dials come out alike, and a dial that breaks is a
       dial that cannot be replaced with the same one.

       The cutting is done on the same CNC machines that cut the metal
       frames, so the shapes are the same shapes the rest of the range
       uses, and the same movements fit the same openings. */
    slug: 'marble-wall-clocks',
    name: 'Marble Wall Clocks',
    blurb:
      'CNC-cut natural marble, with a vein pattern no two pieces share — a weight and a surface a printed dial cannot imitate.',
    tags: ['CNC-cut natural stone', 'Vein-matched pairs', 'Honed or polished edge'],
    tolerance: 'Cut to ±0.5mm; every piece veined differently'
  },
  {
    /* 3D printing.

       What it buys a buyer: no tooling. A shape that would take a
       fifteen-day mould becomes a file and a print, which is why this
       is the material for a small batch of something that has never
       been made before. What it costs: surface finish and repeat
       tolerance, which is why it sits alongside the other seven rather
       than replacing them.

       The prints are resin, not filament — fine layer lines and a
       surface that takes a sprayed and hand-finished paint. Printed
       parts are sprayed and hand-finished in the same booth as the
       moulded ones, which is why the finished clock reads as a clock
       and not as a print. */
    slug: '3d-printed-wall-clocks',
    name: '3D Printed Wall Clocks',
    blurb:
      'Resin-printed bodies with no mould and no tooling cost — the material for a first run of a shape that has never been made before.',
    tags: ['SLA resin printing', 'Sprayed and hand-finished', 'No tooling fee'],
    tolerance: 'Printed to ±0.3mm, hand-finished'
  }
];

/**
 * The seven movements — §5.4-2 of the specification.
 *
 * The table carries six columns: the type, how it drives, how loud it
 * is, how far it drifts in a day, how long the battery lasts, and where
 * it sells. The drift and the battery life are what a buyer comparing
 * two movements actually weighs them on, and neither was in the earlier
 * version of this table.
 *
 * The numbers are the ones the specification gives for the movements it
 * names. Where it names a movement by its usual trade description and
 * the table here says the same thing, the two agree. A movement that is
 * fitted but not in the specification — the LCD and the LED, which have
 * their own section — carries a dash rather than a figure that was
 * invented to fill the cell.
 */
export const MOVEMENTS = [
  {
    name: 'Silent sweep',
    drive: 'Quartz driven, the second hand sweeps without a gear step',
    db: '< 10 dB (anechoic grade)',
    drift: '±0.5s / day',
    battery: '18 months (1× AA)',
    scene: 'Bedrooms, boutique hotels, premium homeware'
  },
  {
    name: 'Step-second',
    drive: 'Quartz driven, the second hand steps once a second',
    db: '28 dB (faint tick)',
    drift: '±1.0s / day',
    battery: '24 months (1× AA)',
    scene: 'Offices, kitchens, the volume seller'
  },
  {
    name: 'Radio-controlled',
    drive: 'Receives WWVB / DCF77 / JJY / BPC and sets itself',
    db: '< 12 dB',
    drift: 'Zero — corrected daily',
    battery: '12 months (2× AA)',
    scene: 'US, Europe and Japan markets, commercial spaces needing accuracy'
  },
  {
    name: 'Westminster chime',
    drive: 'Electronic or mechanical strike on the hour and half hour, with a light-sensitive night silence',
    db: 'Adjustable volume',
    drift: '±1.0s / day',
    battery: '10 months (2× C)',
    scene: 'European classic clocks, premium gifts'
  },
  {
    name: 'Mechanical',
    drive: 'Spring-driven mechanical movement, no battery, wound by hand',
    db: 'Mechanical escapement',
    drift: '±15s / day',
    battery: 'Wound every 7 days',
    scene: 'Enthusiasts, vintage luxury pieces'
  },
  {
    name: 'Music chime',
    drive: 'Plays a built-in chip or music-box melody at set times',
    db: 'Melodic',
    drift: '±1.0s / day',
    battery: '12 months',
    scene: 'Wedding gifts, children’s clocks'
  },
  {
    name: 'Magnetic pendulum',
    drive: 'A magnetic coil drives the pendulum smoothly, with no escapement',
    db: '< 10 dB',
    drift: '±0.8s / day',
    battery: '14 months (2× AA)',
    scene: 'Designer toys and character clocks, large living-room clocks'
  }
];

/**
 * The hands library — §5.4-1.
 *
 * The specification asks for every style to carry a style number, the
 * length of the minute and hour hands, the weight of the set, the
 * balance standard and the glow rating. Those are per-style facts, and
 * a hundred-and-thousand of them are a spreadsheet rather than a page.
 *
 * What is here is the structure: the five materials the specification
 * names, and the six fields each style has to answer for. The rows
 * themselves are left empty until the factory supplies the list — see
 * the material requirements document.
 */
export const HAND_MATERIALS = [
  {
    key: 'brass',
    name: 'Brass (H62)',
    note: 'Solid brass, the traditional choice. Polished, brushed or antique finishes.'
  },
  {
    key: 'aluminium',
    name: 'Aluminium (aerospace grade)',
    note: 'Light and crisp. Anodised in any Pantone, and the default for modern designs.'
  },
  {
    key: 'walnut',
    name: 'Walnut (solid timber)',
    note: 'Cut from black walnut, so the grain can be matched to a wooden housing.'
  },
  {
    key: 'acrylic',
    name: 'Acrylic',
    note: 'The only hand that reads correctly over a printed dial. Translucent or frosted.'
  },
  {
    key: 'plastic',
    name: 'Plastic (custom Pantone)',
    note: 'Injection moulded in the dial colour. The economical option at volume.'
  }
];

/** The fields every hand style has to answer for. */
export const HAND_SPEC_FIELDS = [
  { key: 'style', label: 'Style number', example: 'H-084' },
  { key: 'minuteLen', label: 'Minute hand length', example: '95 mm' },
  { key: 'hourLen', label: 'Hour hand length', example: '62 mm' },
  { key: 'weight', label: 'Weight per set', example: '14 g' },
  { key: 'balance', label: 'Counterweight standard', example: 'Balanced, ±0.2 g' },
  { key: 'lume', label: 'Glow rating', example: 'Super-LumiNova, 4 h' }
];

/** The three packaging tiers — §5.4-4. */
export const PACKAGING_TIERS = [
  {
    tier: 'Tier 1',
    name: 'Mail-order and e-commerce',
    detail:
      '5-ply K=A corrugated carton with a 35mm high-density cut EPE foam insert. ' +
      'Passes the ISTA-1A 1.2m six-side drop test.'
  },
  {
    tier: 'Tier 2',
    name: 'Retail and gift box',
    detail:
      'Rigid greyboard wrapped in matte art paper, magnetic closure, foil-stamped ' +
      'logo and a velvet EVA liner.'
  },
  {
    tier: 'Tier 3',
    name: 'Collector display case',
    detail:
      '3mm high-transmission PMMA case, for designer toys and IP collaboration ' +
      'launches.'
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

;

/* The simplified structures, §6.2.

   Each one carries a picture of what it looks like, because the three
   sentences below describe a clock by what has been taken away from it,
   and a reader who has not seen one has nothing to picture. The
   pictures are animated — a hand moving, a display changing — and they
   are kept as animated files rather than being reduced to a still the
   way a thumbnail would: the point of an open-face clock is that
   something is still moving. */
export const SIMPLIFIED = [
  {
    name: 'Open-face — no dial, no cover',
    detail: 'Engraved solid-wood panels and laser-cut metal shapes, where the mechanism is the design.',
    image: '/simplified/open-wood.gif',
    imageWidth: 100,
    imageHeight: 100
  },
  {
    name: 'No frame, no cover',
    detail: 'Printed transparent acrylic and cast resin art pieces, where the material carries the image.',
    image: '/simplified/open-acrylic.gif',
    imageWidth: 100,
    imageHeight: 100
  },
  {
    name: 'Electronics instead of a movement',
    detail: 'LCD perpetual calendars and LED digital displays, where the display replaces the dial entirely.',
    image: '/simplified/open-digital.gif',
    imageWidth: 297,
    imageHeight: 312
  }
];

/**
 * The four QC steps — §5.5-1 of the specification.
 *
 * The specification gives a measurable limit for each step, and those
 * limits are what make the step checkable rather than a claim. A step
 * that says "raw material is inspected" can be asserted by anyone; a
 * step that says the moisture content is held between 8% and 12% can be
 * audited with a meter.
 *
 * The two numbers in the specification that are stated as thresholds
 * rather than ranges are both here: a movement measuring above 12dB is
 * scrapped, and the vertical clearance between the hands is never less
 * than 1.5mm.
 */
export const QC_STEPS = [
  {
    n: 'Step 01',
    title: 'Raw material QC',
    detail:
      'Moisture content in timber held between 8% and 12%, which is what keeps it ' +
      'from cracking in a dry warehouse or moulding in a damp container. Metal ' +
      'sheet is checked for a burr-free laser edge.',
    metric: '8% – 12% moisture content'
  },
  {
    n: 'Step 02',
    title: '24-hour movement ageing QC',
    detail:
      'Every movement runs on power for 24 hours on the shelf, then accuracy is ' +
      'verified and the tick is measured in an anechoic chamber whose own ' +
      'background noise is held below 10dB — a reading is only as good as the ' +
      'room it was taken in. A movement reading above 12dB is scrapped rather ' +
      'than adjusted.',
    metric: '100% tested · scrap above 12dB'
  },
  {
    n: 'Step 03',
    title: 'Pointer balance & alignment',
    detail:
      'The hands are pressed into their brass bushes on a pneumatic jig, and the ' +
      'vertical clearance between the hour and minute hands is checked. It is ' +
      'never allowed below 1.5mm, which is what stops the sweep from catching.',
    metric: '≥ 1.5mm hand clearance'
  },
  {
    n: 'Step 04',
    title: '1.2m ISTA-1A drop-test packaging QC',
    detail:
      'The finished carton is dropped onto concrete from 120cm — one corner, ' +
      'three edges, six faces in sequence. A clock that cracks its lens or stops ' +
      'running does not leave the building.',
    metric: '120cm · 1 corner, 3 edges, 6 faces'
  }
];

/**
 * The factory's own figures — §5.5-2.
 *
 * The specification names a floor area, a monthly output, the machine
 * park and the number of export markets. None of these can be checked
 * against anything the site already holds, and they are the kind of
 * number a buyer checks. A floor area that turns out to be wrong is
 * worse for a factory than no floor area at all.
 *
 * So the page shows the structure and leaves the values empty, marked
 * as pending, and the material requirements document asks for them.
 */
export const FACTORY_FIGURES: { key: string; label: string; unit: string }[] = [
  { key: 'floorArea', label: 'Manufacturing floor area', unit: 'm²' },
  { key: 'monthlyOutput', label: 'Monthly output', unit: 'pcs' },
  { key: 'exportMarkets', label: 'Export markets', unit: 'countries' },
  { key: 'cncMachines', label: 'CNC machining centres', unit: 'units' },
  { key: 'uvLines', label: 'UV flatbed print lines', unit: 'units' }
];

/**
 * The four factory clips on the home page.
 *
 * Each one is a slot the admin fills with a YouTube link. The slot key
 * runs in the same order as this list, so the first entry is
 * "home-factory-1" and the admin's list of outstanding videos lines up
 * with what the page shows.
 *
 * The clips are vertical, because that is the format the process reads
 * in — a phone held upright beside the bench.
 */
export const FACTORY_SHOTS: [string, string][] = [
  ['Raw material', 'Moisture content and scratch testing on timber, plastic and acrylic.'],
  ['24-hour aging', 'Every movement runs under power for a day, checked for accuracy and measured for sound.'],
  ['Pointer balance', 'Hand straightness and balance torque, so the sweep never catches.'],
  ['Drop test', 'The packed carton dropped from 1.2 metres on all six sides.']
];

/**
 * The certifications — §5.5-2, with the full designations.
 *
 * The earlier version of this list named the certificates without their
 * numbers, which reads as vague to a buyer who is checking a supplier's
 * paperwork: "ISO9001" could mean the 2008 or the 2015 revision, and
 * "RoHS" without a version is not a specification.
 */
export const CERTIFICATIONS = [
  { code: 'ISO 9001:2015', name: 'Quality management system' },
  { code: 'BSCI', name: 'Social compliance standard' },
  { code: 'CE (EMC)', name: 'Electromagnetic compatibility' },
  { code: 'RoHS 2.0', name: 'Restriction of hazardous substances' },
  { code: 'REACH (EC 1907/2006)', name: 'Chemical substances regulation' }
];

/**
 * The 28-day manufacturing route — §5.2-3.
 *
 * Six milestones on a fixed calendar, from the first CAD drawing to the
 * container leaving the port. The dates are the point: a buyer
 * planning a launch needs to know when the goods ship, not just that
 * they will.
 */
export const ROUTE_28 = [
  { day: 'Day 01', title: '3D CAD and vector drawings', detail: 'Renderings and production drawings issued for approval.' },
  { day: 'Day 03', title: 'CNC and laser cutting', detail: 'Precision cutting, and tooling samples with the hands balanced.' },
  { day: 'Day 07', title: 'Sample assembled and shipped', detail: 'The first physical unit is built and sent by express courier.' },
  { day: 'Day 10', title: 'Sample and packaging confirmed', detail: 'The buyer approves the sample and the packaging artwork.' },
  { day: 'Day 25', title: 'Production complete', detail: 'The full run is finished and every movement enters the ageing room.' },
  { day: 'Day 28', title: 'Tested and shipped', detail: '100% aged, calibrated and drop-tested; the container leaves Xiamen.' }
];
