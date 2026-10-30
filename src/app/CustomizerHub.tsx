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
 * string like OEM-WD08-SWEEP-H08-PKG1 that says all of it in one line.
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
import { TABS, buildCode, DEFAULT_PICKS, HUB_FIELD } from '@/lib/hub-data';

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

  /* The configuration, written out in full.

     It is built from `next` rather than from the choices of the
     current render. The current render's choices still hold the old
     value for the option being changed, so a summary built from them
     listed the previous movement after the buyer picked a new one.

     The same text goes in two places: in the message box of the form
     when the form is on this page, and in the link to the form when it
     is not. */
  function summaryText(next: Record<string, string>): string {
    const lines = TABS.map((t) => {
      const c = t.choices.find((x) => x.code === next[t.key]) || t.choices[0];
      return `- ${t.label}: ${c.label}${c.note ? ` (${c.note})` : ''}`;
    });
    return [
      'Configuration:',
      ...lines,
      '',
      'Quantity: ____ pcs',
      'Target price: ____ USD',
      'Other requirements:'
    ].join('\n');
  }

  function choose(key: string, code: string) {
    const next = { ...picks, [key]: code };
    setPicks(next);

    /* The message field on the enquiry form gets the same summary, so
       the buyer is not asked to describe what they just chose. It stays
       editable — the options cannot say everything. */
    const msg = document.getElementById('if-msg') as HTMLTextAreaElement | null;
    if (msg) {
      msg.value = summaryText(next);
    }
  }

  function apply() {
    /* The enquiry form may be on this page or on another one. The
       customizer hub and the form belong together, but the hub is
       also used on a page that only links to the form, so the two
       cases are handled rather than assumed.

       The test is the message box rather than the enquiry section: the
       section is on the page whether or not a form is in it, and a
       scroll to a section with no form in it takes the buyer nowhere.
       The form is what carries the configuration. */
    const msg = document.getElementById('if-msg') as HTMLTextAreaElement | null;
    if (msg) {
      msg.value = summaryText(picks);
      const form = document.getElementById('inquiry');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    /* No form here, so the configuration travels in the link. The code
       goes in the hidden specification field, which is what the factory
       reads, and the full summary goes in the message box, which is
       what the buyer can see and add to. */
    const field = document.getElementById(HUB_FIELD) as HTMLInputElement | null;
    if (field) field.value = code;

    const q = new URLSearchParams();
    q.set('spec', code);
    q.set('msg', summaryText(picks));
    window.location.href = '/contact?' + q.toString();
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
            300 pcs MOQ, mixed colors and specifications in one order. EXW
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
