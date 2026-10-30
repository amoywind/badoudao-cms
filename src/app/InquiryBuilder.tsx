'use client';

/**
 * The inquiry builder.
 *
 * A buyer picks a movement, a hand set and a packaging tier, and the
 * component writes a specification string like
 * `WC-WD-2026-08-SWEEP-H04-PKG2` — the shorthand the factory and the
 * buyer can both read back without either of them writing a paragraph.
 *
 * The string is put into a hidden field on the enquiry form, so the
 * configuration reaches the factory without the buyer having to describe
 * it in prose. That is the whole point: a form that asks a buyer to
 * explain their configuration is a form they will abandon.
 *
 * It also fills the visible message field, because a buyer who has just
 * spent a minute configuring a clock should not then have to type the
 * same information again — but the message field is left editable, since
 * the buyer may want to add something the options cannot express.
 *
 * The options are the ones the factory actually fits, from
 * lib/vocabulary.ts. They are not the per-product options in the
 * database, which are price deltas for a specific model; a buyer
 * configuring a base platform needs the range.
 */

import { useState } from 'react';

export type BuilderOption = {
  /** Short code used in the generated specification string. */
  code: string;
  /** What the buyer sees. */
  label: string;
};

export type BuilderGroup = {
  key: string;
  label: string;
  options: BuilderOption[];
  /** The code used when the buyer has not chosen anything. */
  fallback: string;
};

export const BUILDER_GROUPS: BuilderGroup[] = [
  {
    key: 'movement',
    label: 'Movement',
    fallback: 'SWEEP',
    options: [
      { code: 'SWEEP', label: 'Continuous silent sweep' },
      { code: 'STEP', label: 'Standard step-second' },
      { code: 'RCC', label: 'Radio-controlled (RCC / atomic)' },
      { code: 'TORQUE', label: 'High-torque quartz' },
      { code: 'PEND', label: 'Dynamic pendulum' },
      { code: 'CHIME', label: 'Hourly melody & chime' },
      { code: 'GEAR', label: 'Kinetic moving gear' },
      /* LCD and LED are not movements — they replace the movement and
         the dial, and have their own section on the components page.
         They stay here because they are choices a buyer has to be able
         to make in the same breath. */
      { code: 'LCD', label: 'LCD calendar display' },
      { code: 'LED', label: 'LED digital display' }
    ]
  },
  {
    key: 'hands',
    label: 'Hands',
    fallback: 'ALU',
    options: [
      { code: 'ALU', label: 'Aluminum' },
      { code: 'BRS', label: 'Brass' },
      { code: 'WD', label: 'Solid wood' },
      { code: 'ACR', label: 'Acrylic' },
      { code: 'PLA', label: 'Custom Pantone plastic' }
    ]
  },
  {
    key: 'packaging',
    label: 'Packaging',
    fallback: 'KRAFT',
    options: [
      { code: 'KRAFT', label: 'Mail-order kraft box' },
      { code: 'GIFT', label: 'Color gift box' },
      { code: 'ACRYLIC', label: 'Acrylic display box' },
      { code: 'FOAM', label: 'Custom foam insert' }
    ]
  }
];

/** The name of the hidden field the specification is written into. */
export const SPEC_FIELD = 'spec';

/**
 * Build the specification string.
 *
 * The product id comes first so the string is unique per product, then
 * the chosen codes, one per group. Example: `MDF-01-SWEEP-BRS-GIFT`.
 *
 * The groups are the ones passed in, so the string carries what this
 * model can actually be configured as rather than a fixed three.
 */
export function buildSpec(
  productId: string,
  picks: Record<string, string>,
  groups: BuilderGroup[] = BUILDER_GROUPS
) {
  const codes = groups.map((g) => picks[g.key] || g.fallback);
  return [productId, ...codes].join('-');
}

/** The message the form is pre-filled with. */
export function buildMessage(
  productId: string,
  productName: string,
  picks: Record<string, string>,
  groups: BuilderGroup[] = BUILDER_GROUPS
) {
  const lines = groups.map((g) => {
    const opt = g.options.find((o) => o.code === picks[g.key]);
    return `${g.label}: ${opt ? opt.label : g.fallback}`;
  });

  return [
    `Product: ${productName} (${productId})`,
    ...lines,
    '',
    'Quantity: ____ pcs',
    'Target price: ____ USD',
    'Other requirements:'
  ].join('\n');
}

export function InquiryBuilder({
  productId,
  productName,
  /* The groups this model can be configured as. The page builds them
     from what the owner recorded for the model, so the builder shows
     the options that exist for this clock rather than a fixed list,
     and the one already chosen is the one the model is built with.

     Without them the builder falls back to the factory's general set,
     which is what a base platform needs. */
  groups,
  /** The id of the form's message field, so the builder can fill it. */
  messageFieldId = 'if-msg'
}: {
  productId: string;
  productName: string;
  groups?: BuilderGroup[];
  messageFieldId?: string;
}) {
  const list = groups && groups.length ? groups : BUILDER_GROUPS;

  /* The model as it is built. Each group opens on what the factory
     already fits, so the buyer is shown the clock they are looking at
     and can change one thing about it. */
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const g of list) start[g.key] = g.fallback;
    return start;
  });

  const spec = buildSpec(productId, picks, list);

  /* The hidden field carries the specification; the message field carries
     the readable version. Both are updated on every change so the buyer
     can see the summary change as they click. */
  function apply(next: Record<string, string>) {
    setPicks(next);

    const specEl = document.getElementById(SPEC_FIELD) as HTMLInputElement | null;
    if (specEl) specEl.value = buildSpec(productId, next, list);

    const msgEl = document.getElementById(messageFieldId) as HTMLTextAreaElement | null;
    if (msgEl) msgEl.value = buildMessage(productId, productName, next, list);
  }

  return (
    <div className="spec">
      <div className="spec-h">Inquiry builder</div>

      {list.map((g) => (
        <div className="spec-row" key={g.key}>
          <div className="spec-lbl">{g.label}</div>
          <div className="spec-opts">
            {g.options.map((o) => (
              <button
                key={o.code}
                type="button"
                className={`spec-opt${picks[g.key] === o.code ? ' on' : ''}`}
                onClick={() => apply({ ...picks, [g.key]: o.code })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="spec-sum">
        <span style={{ opacity: 0.6 }}>SPEC · </span>
        {spec}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.5 }}>
        This reference travels with your enquiry. Change anything above and it
        updates.
      </p>

      {/* The hidden field the form submits. It lives inside the builder
          rather than inside the form, so the builder can be dropped onto a
          page that has no form at all without breaking. */}
      <input type="hidden" id={SPEC_FIELD} name={SPEC_FIELD} value={spec} readOnly />
    </div>
  );
}
