/**
 * The customizer's options.
 *
 * These live here rather than in the component, because two kinds of
 * code need them and they sit on opposite sides of the client
 * boundary:
 *
 *   the home page's quick picker — a client component
 *   the customizer page — a server component that reads the choices
 *                               out of the URL
 *
 * A server component cannot import a plain value out of a "use
 * client" module. It gets a proxy object instead, and the first thing
 * that touches it gets "is not iterable" — a runtime error on a page
 * that compiled and built cleanly.
 *
 * So the data is here, in a module with no directive on it, and both
 * sides import it from here.
 */

export type Choice = {
  /** Short code used in the generated specification string. */
  code: string;
  label: string;
  /** One line describing what this choice actually is. */
  note: string;
};

export type Tab = {
  key: string;
  label: string;
  choices: Choice[];
};

export const TABS: Tab[] = [
  {
    key: 'housing',
    label: 'Housing',
    choices: [
      { code: 'WD08', label: 'Solid wood 90°', note: 'Walnut or white oak, mortise and tenon corner joint' },
      { code: 'AL02', label: 'Anodized aluminum', note: 'CNC laser-cut, brushed and anodized frame' },
      { code: 'AC05', label: '5mm acrylic', note: 'Optical-grade PMMA, reverse UV print' },
      { code: 'AB03', label: 'ABS plastic', note: 'Injection molded, Pantone matched' },
      { code: 'GC02', label: 'Crystal porcelain', note: 'Heat-melted glaze over tempered glass' },
      { code: 'RS04', label: 'Epoxy resin river', note: 'Vacuum-cast live-edge resin base' }
    ]
  },
  {
    key: 'movement',
    label: 'Movement',
    choices: [
      { code: 'SWEEP', label: 'Silent sweep', note: '<10 dBA, no stepping tick' },
      { code: 'STEP', label: 'Standard step-second', note: '28 dBA crisp tick, 24-month battery' },
      { code: 'RCC', label: 'Radio-controlled (RCC / atomic)', note: 'Auto-sets from WWVB / DCF77 / MSF / JJY' },
      { code: 'TORQUE', label: 'High-torque quartz', note: '3–5× torque, hands to 450 mm' },
      { code: 'PEND', label: 'Dynamic pendulum', note: 'Independent pulse coil drives the bob or tail' },
      { code: 'CHIME', label: 'Hourly melody & chime', note: 'Selectable melodies, light-sensor night silence' },
      { code: 'GEAR', label: 'Kinetic moving gear', note: 'Second motor drives exposed gears' }
    ]
  },
  {
    key: 'hands',
    label: 'Hands',
    choices: [
      { code: 'H08', label: 'Brass baton', note: 'H62 brass, style #084' },
      { code: 'H12', label: 'Walnut', note: 'Solid black walnut, cut to match the housing' },
      { code: 'H03', label: 'Matte black aluminum', note: 'Anodized, minimal profile' },
      { code: 'H21', label: 'Super-LumiNova', note: 'Glow-in-the-dark, night readable' },
      { code: 'H16', label: 'Colored acrylic', note: 'Translucent, Pantone matched' }
    ]
  },
  {
    key: 'packaging',
    label: 'Packaging',
    choices: [
      { code: 'PKG1', label: 'Drop-tested kraft box', note: 'ISTA-1A 1.2m, EPE foam insert' },
      { code: 'PKG2', label: 'Magnetic gift box', note: 'Rigid board, foil logo, velvet liner' },
      { code: 'PKG3', label: 'Acrylic display case', note: '3mm PMMA, for collector and IP editions' }
    ]
  }
];

/** The code the specification shows: OEM-WD08-SWEEP-H08-PKG1. */
export function buildCode(picks: Record<string, string>) {
  const housing = picks.housing || 'WD08';
  const movement = picks.movement || 'SWEEP';
  const hands = picks.hands || 'H08';
  const packaging = picks.packaging || 'PKG1';
  return `OEM-${housing}-${movement}-${hands}-${packaging}`;
}

/** The four decisions, in the order the tabs show them. */
export const DEFAULT_PICKS: Record<string, string> = {
  housing: 'WD08',
  movement: 'SWEEP',
  hands: 'H08',
  packaging: 'PKG1'
};

/** The name of the hidden field the code travels in. */
export const HUB_FIELD = 'spec';
