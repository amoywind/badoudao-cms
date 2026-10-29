/**
 * The six modular components — MODULE_SPEC §3.
 *
 * Each part is a separate engineering decision, and each one is
 * described the way an engineer would describe it: the materials the
 * factory can run, the dimensions and tolerances it holds, and the
 * surface treatments it applies.
 *
 * The numbers are the specification's. Where they are tolerances rather
 * than options — the 1.5mm clearance between the hands, the 0.05g
 * balance of a hand set, the 1.0 colour delta of the UV print — they
 * are the ones a buyer checks, and they are the reason the panel
 * exists rather than a list of materials.
 *
 * The Chinese names are here because the buyer is often buying for a
 * market that reads them, and because the factory's own documents use
 * them.
 */

export type ComponentLayer = {
  /** The part number, 1 to 6. */
  n: string;
  /** The English name. */
  name: string;
  /** The Chinese name. */
  cn: string;
  /** The label on the diagram. */
  label: string;
  /** One line of what this part is for. */
  summary: string;
  /** The materials the factory runs for this part. */
  materials: string;
  /** The dimensions and tolerances it holds. */
  tolerances: string;
  /** The surface treatments and finishes. */
  craft: string;
  /** The specialist architectures this part enables. */
  special: { title: string; detail: string }[];
};

export const COMPONENTS: ComponentLayer[] = [
  {
    n: '1',
    name: 'Outer Frame / Bezel',
    cn: '表框 / 边框',
    label: 'Outer frame',
    summary:
      'The body the clock is built on. It carries the dial, holds the movement behind it and takes the wall load.',
    materials:
      'Aerospace aluminium 6061, FAS-grade black walnut or white oak, virgin ABS engineering plastic, 5–10mm optical acrylic, cast epoxy resin.',
    tolerances:
      'Diameter 8" (20cm) to 24" (60cm). Frame depth 15mm to 65mm. Wall mounting load tested to 5kg on a single fixing.',
    craft:
      'CNC 5-axis turning, brushed finish, Pantone-matched powder coating, anodising, antique brass hand-finish, food-grade natural wax oil.',
    special: [
      {
        title: 'Open-Face (No Glass, No Lens)',
        detail: 'Carved solid wood slabs and floating metal dials. The board is the dial, and the hands are exposed.'
      },
      {
        title: 'Frameless Floating PMMA',
        detail: 'Zero-bezel 5mm optical acrylic with diamond-polished edges, standing 15mm off the wall.'
      },
      {
        title: 'Dual-Face 90° Corner Mount',
        detail: 'A cast 90° corner bracket with two movements running independently and in sync.'
      }
    ]
  },
  {
    n: '2',
    name: 'Front Lens Cover',
    cn: '表盘罩 / 玻璃镜面',
    label: 'Lens cover',
    summary:
      'The cover over the dial. It decides how much of the face is visible and how much light comes back off it.',
    materials:
      '2mm to 4mm automotive-grade high-transmission toughened glass, domed heat-bent glass, optical-grade PMMA acrylic.',
    tolerances:
      'Light transmission above 96%. Impact-rated and shatter-resistant. Bevelled edge on every cut so the edge is not a cut edge.',
    craft:
      'AR anti-glare coating, crystal porcelain hot-melt lamination, anti-fingerprint surface treatment.',
    special: [
      {
        title: 'No-Lens Open Face',
        detail: 'The lens is left off entirely when the dial is printed straight onto the frame or the board.'
      },
      {
        title: 'Crystal Porcelain Dome',
        detail: 'A porcelain layer hot-melted onto the glass for a deep, hard-wearing gloss.'
      }
    ]
  },
  {
    n: '3',
    name: 'Clock Hands System',
    cn: '精密表针 / 指针系统',
    label: 'Hands alloy',
    summary:
      'The hands. A thousand and more moulded shapes, and the part of the clock a buyer touches every day.',
    materials:
      'H62 solid brass, stamped ultra-light aerospace aluminium, CNC-carved black walnut, laser-coloured acrylic.',
    tolerances:
      'Hand length 45mm to 280mm. Vertical clearance between the hour and minute hands never below 1.5mm. Counterweight balance within 0.05g per set.',
    craft:
      'Super-LumiNova glow coating, diamond-cut polishing, custom brand shapes cut by wire EDM.',
    special: [
      {
        title: 'Balanced Counterweight',
        detail: 'A weighted tail on the second hand, sized so a long hand does not drag the movement down.'
      },
      {
        title: 'Wire-EDM Brand Shapes',
        detail: 'A hand cut to the buyer\'s own outline, from a vector drawing rather than a catalogue shape.'
      }
    ]
  },
  {
    n: '4',
    name: 'Custom Dial Face',
    cn: '钟面 / 表盘',
    label: 'Custom dial',
    summary:
      'The face the hands run over. It is where the buyer\'s artwork goes, and it is the part that has to survive the sun.',
    materials:
      '250g matte art board, injection-moulded engineering plastic, brushed aluminium panel, natural timber veneer, automotive crystal porcelain, black walnut river slab.',
    tolerances:
      'Single-colour silk screen, 8-colour high-precision UV flatbed printing, 3D embossed injection, laser-engraved grooves. Colour tolerance ΔE below 1.0.',
    craft:
      'FSC-certified paper, Pantone solid-colour accuracy, non-fading archival UV ink rated for long-term indoor light.',
    special: [
      {
        title: 'Single-Colour Silk Screen',
        detail: 'One colour, printed straight onto the board, for a dial that has to cost almost nothing.'
      },
      {
        title: '3D Embossed Injection',
        detail: 'The dial is moulded with the relief in it rather than printed on it — for a shape you can feel.'
      },
      {
        title: 'Laser Engraved Grooves',
        detail: 'Index grooves cut into the surface, filled with paint, for a dial that catches the light.'
      }
    ]
  },
  {
    n: '5',
    name: 'Movement Motor & IC',
    cn: '核心机芯与驱动电路',
    label: 'Movement',
    summary:
      'The motor and the electronics behind it. This is what makes the difference between a clock that ticks and one that does not.',
    materials:
      'Silent sweep under 10dB, standard step-second, radio-controlled RCC covering WWVB / DCF77 / JJY / BPC, Westminster chime, FSTN LCD perpetual-calendar module, see-through-wood LED dot matrix.',
    tolerances:
      'Brass centre arbor, high-torque nylon gear train, 100% of movements aged on power for 24 hours, running current below 130µA.',
    craft:
      'Hand-regulated amplitude, and a movement that is inspected again after it is fitted rather than before.',
    special: [
      {
        title: 'Radio-Controlled (RCC)',
        detail: 'Receives WWVB, DCF77, JJY or BPC and sets itself. Zero drift, corrected daily.'
      },
      {
        title: 'Westminster Chime',
        detail: 'The quarter-hour strike, with a light sensor that silences it overnight.'
      },
      {
        title: 'Electronic-Hybrid Face',
        detail: 'A slot laser-cut into the dial with an FSTN wide-temperature LCD, or a 0.4mm LED matrix under a timber veneer.'
      }
    ]
  },
  {
    n: '6',
    name: 'Backplate & Wall Hanger',
    cn: '底板 / 电池舱与挂钩',
    label: 'Backplate',
    summary:
      'The back. It holds the movement, carries the battery and takes the weight of the clock on the wall.',
    materials:
      'High-impact flame-retardant PP/ABS injection backplate, or cold-rolled stamped stainless steel.',
    tolerances:
      'Dual cross-locking anti-rattle wall holes, a recessed flush-fit battery compartment, silicone anti-vibration damping pads.',
    craft:
      'High-precision laser marking of the brand on the reverse, the purchase-order serial, and the CE / RoHS compliance marks.',
    special: [
      {
        title: 'Flush Recessed Battery Bay',
        detail: 'The compartment sits down inside the plate so the back of the clock stays flat against the wall.'
      },
      {
        title: 'Stainless Steel Backplate',
        detail: 'A stamped stainless back for the flat-pack and hospitality segment, where the clock is handled.'
      }
    ]
  }
];
