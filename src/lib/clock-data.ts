/**
 * The clock engine's data.
 *
 * Four dial faces, four hand alloys, six time zones and two drive
 * modes. The dial and hand sets are the ones the buyer assembles in
 * the first screen, so they live here rather than inside the component
 * — the same reason the material tags live in the vocabulary file.
 *
 * The colors are the specification's. The point of a live swatch is
 * that what the buyer clicks is what the factory can make, so the
 * numbers here are the numbers that go on the quote.
 */

/** The four dial faces. */
export const DIAL_FACES = [
  {
    key: 'white',
    name: 'Architectural White',
    short: 'Architectural White',
    bg: '#FFFFFF',
    bezel: '#E8EAED',
    tick: '#111111',
    major: '#111111',
    digit: '#111111',
    micro: '#8A9199',
    note: 'Modern minimal. The default for a printed dial.'
  },
  {
    key: 'obsidian',
    name: 'Matte Obsidian',
    short: 'Matte Obsidian',
    bg: '#161618',
    bezel: '#2A2C30',
    tick: '#8A9199',
    major: '#D5D8DD',
    digit: '#E8EAED',
    micro: '#7A828D',
    note: 'Matte black. Light hands, no glare under a shop light.'
  },
  {
    key: 'walnut',
    name: 'Black Walnut Grain',
    short: 'Black Walnut',
    bg: '#3A271B',
    bezel: '#4A3324',
    tick: '#D9C4A8',
    major: '#E8D9C4',
    digit: '#F0E4D2',
    micro: '#C4AE94',
    note: 'Real walnut veneer. The grain is photographable and no two are the same.'
  },
  {
    key: 'concrete',
    name: 'Cast Concrete Gray',
    short: 'Cast Concrete',
    bg: '#8E9196',
    bezel: '#7C7F84',
    tick: '#FFFFFF',
    major: '#FFFFFF',
    digit: '#FFFFFF',
    micro: '#E2E4E7',
    note: 'Cast concrete finish for the industrial architectural segment.'
  }
] as const;

/** The four hand alloys. */
export const HAND_ALLOYS = [
  {
    key: 'brass',
    name: 'Brushed Brass #08',
    short: 'Brushed Brass',
    hour: '#C59B27',
    minute: '#C59B27',
    second: '#0052CC',
    note: 'Solid brass, brushed. The traditional choice, and the one that photographs best.'
  },
  {
    key: 'black',
    name: 'Anodized Black #22',
    short: 'Anodized Black',
    hour: '#111111',
    minute: '#111111',
    second: '#0052CC',
    note: 'Anodized aluminum in black. Crisp and light on a light dial.'
  },
  {
    key: 'walnut',
    name: 'Carved Walnut #14',
    short: 'Carved Walnut',
    hour: '#5C3826',
    minute: '#5C3826',
    second: '#A25927',
    note: 'CNC-carved walnut. Matches a wooden housing grain for grain.'
  },
  {
    key: 'lumi',
    name: 'LumiNova Tactical #05',
    short: 'LumiNova',
    hour: '#22C55E',
    minute: '#22C55E',
    second: '#86EFAC',
    note: 'Super-LumiNova glow coating. Reads in the dark without a lamp.'
  }
] as const;

/**
 * The six time zones.
 *
 * The factory's own time is first and marked, because the question a
 * buyer is usually trying to answer is what time it is at the factory.
 *
 * The visitor's own zone is not in this list. It is selected
 * automatically after the page loads, and the label says so — a buyer
 * in Amsterdam should not have to hunt through six cities to find the
 * one they are in.
 */
export const CLOCK_ZONES = [
  { id: 'xiamen', label: 'Beijing / Xiamen (UTC+8)', note: 'Factory HQ', offset: 8 },
  { id: 'london', label: 'London (UTC+0)', note: '', offset: 0 },
  { id: 'paris', label: 'Paris (CET +1)', note: '', offset: 1 },
  { id: 'newyork', label: 'New York (EST -5)', note: '', offset: -5 },
  { id: 'losangeles', label: 'Los Angeles (PST -8)', note: '', offset: -8 },
  { id: 'tokyo', label: 'Tokyo (JST +9)', note: '', offset: 9 }
] as const;

/**
 * The two drive modes.
 *
 * The decibel figures are the ones the specification gives, and they
 * are the argument the module makes: a buyer who has heard a cheap
 * clock tick has heard the tick and the sweep and wonders which one
 * they would be getting. Showing the difference is the answer.
 */
export const DRIVE_MODES = [
  {
    key: 'sweep',
    name: 'Continuous Sweep',
    db: '<10 dBA',
    dbValue: 8.4,
    /* The reading wanders a little, the way a real measurement does.
       A number that never moves reads as a drawing. */
    dbRange: [8.0, 9.2] as [number, number],
    quiet: 'Whisper-quiet continuous sweep · <10 dBA',
    chip: 'Silent'
  },
  {
    key: 'step',
    name: 'Step Second',
    db: '28 dBA',
    dbValue: 28.4,
    dbRange: [9.2, 9.2] as [number, number],
    quiet: 'Crisp interval tick · 28 dBA',
    chip: 'Standard'
  }
] as const;

/**
 * The acoustic simulator's two voices.
 *
 * The movement sound is synthesised rather than loaded. A factory
 * recording is a file, and a file on the server is a file the visitor
 * downloads before they have decided they want to hear it. Synthesising
 * the tick means the page carries no audio at all, and the sound is
 * generated the moment it is asked for.
 */
export const ACOUSTICS = {
  sweep: {
    /* A continuous electromagnetic hum, barely there. */
    type: 'sine' as OscillatorType,
    freq: 60,
    gain: 0.005,
    duration: 80
  },
  step: {
    /* A gear tooth striking: a sharp transient that falls away. */
    type: 'triangle' as OscillatorType,
    freq: 1400,
    fallTo: 300,
    gain: 0.08,
    duration: 40
  }
};
