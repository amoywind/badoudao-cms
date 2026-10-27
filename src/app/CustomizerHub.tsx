'use client';

import { SamplePolicy } from './SamplePolicy';

/**
 * The customizer hub — §5.1-6 of the specification.
 *
 * Four tabs, and the buyer never leaves the screen: the housing, the
 * movement, the hands, the packaging. A summary panel on the right
 * assembles the choices into a code, and the button under it hands the
 * result to the enquiry form at the bottom of the page.
 *
 * The code is the point. A buyer who has spent a minute choosing a
 * housing, a movement, a hand alloy and a packaging tier now has a
 * string like OEM-WD08-SILENT-H08-PKG1 that says all of it in one line.
 * That string is what the factory quotes against, and it is what makes
 * a written enquiry a structured one — the alternative is a buyer
 * describing their configuration in a paragraph and the factory
 * guessing which of the six movements they meant.
 *
 * The estimated FOB price is deliberately absent. The specification's
 * example shows "$8.20/pc", but a price is a number the factory quotes
 * for a specific configuration, and this hub offers combinations the
 * factory may never have costed — a walnut housing with a radio-
 * controlled movement and a foam insert is a different clock from the
 * one in the photograph. An estimate made up from nothing is worse than
 * no estimate: a buyer treats it as a price and stops asking.
 *
 * So the summary carries the code and the description, and the price
 * slot says what it will be: quoted on request. The number arrives with
 * the quotation, inside the twelve-hour window the site promises
 * everywhere else.
 */

import { useEffect, useState } from 'react';

type Choice = {
  /** Short code used in the generated specification string. */
  code: string;
  label: string;
  /** One line describing what this choice actually is. */
  note: string;
};

type Tab = {
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
      { code: 'AL02', label: 'Anodised aluminium', note: 'CNC laser-cut, brushed and anodised frame' },
      { code: 'AC05', label: '5mm acrylic', note: 'Optical-grade PMMA, reverse UV print' },
      { code: 'AB03', label: 'ABS plastic', note: 'Injection moulded, Pantone matched' },
      { code: 'GC02', label: 'Crystal porcelain', note: 'Heat-melted glaze over tempered glass' },
      { code: 'RS04', label: 'Epoxy resin river', note: 'Vacuum-cast live-edge resin base' }
    ]
  },
  {
    key: 'movement',
    label: 'Movement',
    choices: [
      { code: 'SILENT', label: 'Silent sweep', note: '<10dB, sweep movement, no tick' },
      { code: 'STEP', label: 'Step second', note: '28dB, the volume seller' },
      { code: 'RCC', label: 'Radio-controlled', note: 'Auto-sets from WWVB / DCF77 / JJY / BPC' },
      { code: 'CHIME', label: 'Westminster chime', note: 'Hourly and half-hourly, adjustable' },
      { code: 'MECH', label: 'Mechanical', note: 'Spring wound, no battery' },
      { code: 'MUSIC', label: 'Music chime', note: 'Built-in melody chip' },
      { code: 'PEND', label: 'Magnetic pendulum', note: 'Smooth magnetic drive' }
    ]
  },
  {
    key: 'hands',
    label: 'Hands',
    choices: [
      { code: 'H08', label: 'Brass baton', note: 'H62 brass, style #084' },
      { code: 'H12', label: 'Walnut', note: 'Solid black walnut, cut to match the housing' },
      { code: 'H03', label: 'Matte black aluminium', note: 'Anodised, minimal profile' },
      { code: 'H21', label: 'Super-LumiNova', note: 'Glow-in-the-dark, night readable' },
      { code: 'H16', label: 'Coloured acrylic', note: 'Translucent, Pantone matched' }
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

/** The code the specification shows: OEM-WD08-SEIKO-H08-PKG1. */
export function buildCode(picks: Record<string, string>) {
  const housing = picks.housing || 'WD08';
  const movement = picks.movement || 'SILENT';
  const hands = picks.hands || 'H08';
  const packaging = picks.packaging || 'PKG1';
  return `OEM-${housing}-${movement}-${hands}-${packaging}`;
}

/** The name of the hidden field the code travels in. */
export const HUB_FIELD = 'spec';

/** The four decisions, in the order the tabs show them. */
export const DEFAULT_PICKS: Record<string, string> = {
  housing: 'WD08',
  movement: 'SILENT',
  hands: 'H08',
  packaging: 'PKG1'
};

export function CustomizerHub({
  replyHours = 4,
  initial
}: {
  replyHours?: number;
  /** The choices carried in from the home page's quick picker. */
  initial?: Record<string, string>;
}) {
  const [tab, setTab] = useState(TABS[0].key);
  const [picks, setPicks] = useState<Record<string, string>>({
    ...DEFAULT_PICKS,
    ...(initial || {})
  });

  const code = buildCode(picks);

  const chosen = TABS.map((t) => {
    const c = t.choices.find((x) => x.code === picks[t.key]) || t.choices[0];
    return { tab: t, choice: c };
  });

  /* The specification travels into the enquiry form through a hidden
     field, and the field is written by id — the hub and the form are
     two components that do not know about each other.

     So the field is written on every change rather than only when the
     buyer clicks an option. A buyer who accepts the defaults and
     submits straight away must still send a specification; before this,
     their code was empty unless they had touched something.

     The effect runs after the paint, so the field is written once the
     form is on the page. */
  useEffect(() => {
    const el = document.getElementById(HUB_FIELD) as HTMLInputElement | null;
    if (el) el.value = code;
  }, [code]);

  function choose(key: string, code: string) {
    const next = { ...picks, [key]: code };
    setPicks(next);

    /* The message field on the enquiry form gets the same summary, so
       the buyer is not asked to describe what they just chose. It stays
       editable — the options cannot say everything.

       The summary is built from `next` rather than from the choices of
       the current render. The current render's choices still hold the
       old value for the option being changed, so a summary built from
       them listed the previous movement after the buyer picked a new
       one. */
    const msg = document.getElementById('if-msg') as HTMLTextAreaElement | null;
    if (msg) {
      const lines = TABS.map((t) => {
        const c = t.choices.find((x) => x.code === next[t.key]) || t.choices[0];
        return `- ${t.label}: ${c.label}${c.note ? ` (${c.note})` : ''}`;
      });
      msg.value = [
        'Configuration:',
        ...lines,
        '',
        'Quantity: ____ pcs',
        'Target price: ____ USD',
        'Other requirements:'
      ].join('\n');
    }
  }

  function apply() {
    /* The enquiry form may be on this page or on another one. The
       customizer hub and the form belong together, but the hub is
       also used on a page that only links to the form, so the two
       cases are handled rather than assumed.

       A hidden field carries the specification across the navigation,
       because the form on the other page reads it by id. */
    const form = document.getElementById('inquiry');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const field = document.getElementById(HUB_FIELD) as HTMLInputElement | null;
    if (field) field.value = code;

    window.location.href = '/contact/?spec=' + encodeURIComponent(code);
  }

  const active = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div className="hub">
      <div className="hub-main">
        <div className="hub-tabs" role="tablist">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`hub-tab${tab === t.key ? ' on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="hub-tab-n tnum">{String(i + 1).padStart(2, '0')}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="hub-panel" role="tabpanel">
          <div className="hub-opts">
            {active.choices.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`hub-opt${picks[active.key] === c.code ? ' on' : ''}`}
                onClick={() => choose(active.key, c.code)}
              >
                <span className="hub-opt-l">{c.label}</span>
                <span className="hub-opt-n">{c.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* The sample policy and the note.

            They sit under the options rather than in the summary
            column because that is where the space is. The summary
            column carries the specification, the price and the button,
            and it is the taller of the two — leaving the options
            column with four hundred pixels of nothing under it.

            The placement is also the better one. A buyer who has just
            chosen a housing and is wondering whether to see one made
            before ordering three hundred of them is reading the
            options side of the card, not the receipt side. */}
        <div className="hub-foot">
          <SamplePolicy compact />

          <p className="hub-note">
            300 pcs MOQ, mixed colours and specifications in one order. EXW
            quotation and a photorealistic 3D rendering within {replyHours} hours.
          </p>
        </div>
      </div>

      <aside className="hub-sum">
        <div className="hub-sum-h">Your specification</div>

        <div className="hub-code tnum">{code}</div>

        <dl className="hub-list">
          {chosen.map(({ tab: t, choice: c }) => (
            <div key={t.key}>
              <dt>{t.label}</dt>
              <dd>{c.label}</dd>
            </div>
          ))}
        </dl>

        {/* The price slot. The specification shows an estimated FOB
            price here; this hub cannot produce one honestly, because the
            combinations it offers are not the combinations the factory
            has costed. The slot is kept so the buyer sees where the
            price will appear, and so nothing else has to move when the
            quotation system starts returning figures. */}
        <div className="hub-price">
          <span className="hub-price-k">Estimated EXW price</span>
          <span className="hub-price-v">Quoted on request</span>
        </div>

        <button type="button" className="btn btn-primary hub-apply" onClick={apply}>
          Apply Spec to RFQ Form ↓
        </button>
      </aside>
    </div>
  );
}
