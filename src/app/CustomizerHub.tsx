'use client';

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

import { useState } from 'react';

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

const TABS: Tab[] = [
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
function buildCode(picks: Record<string, string>) {
  const housing = picks.housing || 'WD08';
  const movement = picks.movement || 'SILENT';
  const hands = picks.hands || 'H08';
  const packaging = picks.packaging || 'PKG1';
  return `OEM-${housing}-${movement}-${hands}-${packaging}`;
}

/** The name of the hidden field the code travels in. */
export const HUB_FIELD = 'spec';

export function CustomizerHub() {
  const [tab, setTab] = useState(TABS[0].key);
  const [picks, setPicks] = useState<Record<string, string>>({
    housing: 'WD08',
    movement: 'SILENT',
    hands: 'H08',
    packaging: 'PKG1'
  });

  const code = buildCode(picks);

  const chosen = TABS.map((t) => {
    const c = t.choices.find((x) => x.code === picks[t.key]) || t.choices[0];
    return { tab: t, choice: c };
  });

  function choose(key: string, code: string) {
    const next = { ...picks, [key]: code };
    setPicks(next);

    const el = document.getElementById(HUB_FIELD) as HTMLInputElement | null;
    if (el) el.value = buildCode(next);

    /* The message field on the enquiry form gets the same summary, so
       the buyer is not asked to describe what they just chose. It stays
       editable — the options cannot say everything. */
    const msg = document.getElementById('if-msg') as HTMLTextAreaElement | null;
    if (msg) {
      msg.value = [
        'Configuration:',
        ...chosen.map(
          ({ tab: t, choice: c }) =>
            `- ${t.label}: ${c.label}${c.note ? ` (${c.note})` : ''}`
        ),
        '',
        'Quantity: ____ pcs',
        'Target price: ____ USD',
        'Other requirements:'
      ].join('\n');
    }
  }

  function apply() {
    const form = document.getElementById('inquiry');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          <span className="hub-price-k">Estimated FOB</span>
          <span className="hub-price-v">Quoted on request</span>
        </div>

        <button type="button" className="btn btn-primary hub-apply" onClick={apply}>
          Apply Spec to RFQ Form ↓
        </button>

        <p className="hub-note">
          300 pcs MOQ, mixed colours and specifications in one order. FOB
          quotation and a photorealistic 3D rendering within 12 hours.
        </p>

        <input type="hidden" id={HUB_FIELD} name={HUB_FIELD} value={code} readOnly />
      </aside>
    </div>
  );
}
