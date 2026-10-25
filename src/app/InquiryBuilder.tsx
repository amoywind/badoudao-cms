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
    fallback: 'STD',
    options: [
      { code: 'SWEEP', label: 'Silent sweep quartz' },
      { code: 'STEP', label: 'Step-second quartz' },
      { code: 'RADIO', label: 'Radio-controlled' },
      { code: 'CHIME', label: 'Chime' },
      { code: 'MECH', label: 'Mechanical' },
      { code: 'LCD', label: 'LCD calendar display' },
      { code: 'LED', label: 'LED digital display' }
    ]
  },
  {
    key: 'hands',
    label: 'Hands',
    fallback: 'STD',
    options: [
      { code: 'ALU', label: 'Aluminium' },
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
      { code: 'GIFT', label: 'Colour gift box' },
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
 * the three chosen codes. Example: `MDF-01-SWEEP-BRS-GIFT`.
 */
export function buildSpec(productId: string, picks: Record<string, string>) {
  const codes = BUILDER_GROUPS.map((g) => picks[g.key] || g.fallback);
  return [productId, ...codes].join('-');
}

/** The message the form is pre-filled with. */
export function buildMessage(
  productId: string,
  productName: string,
  picks: Record<string, string>
) {
  const lines = BUILDER_GROUPS.map((g) => {
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
  /** The id of the form's message field, so the builder can fill it. */
  messageFieldId = 'if-msg'
}: {
  productId: string;
  productName: string;
  messageFieldId?: string;
}) {
  const [picks, setPicks] = useState<Record<string, string>>({
    movement: 'SWEEP',
    hands: 'ALU',
    packaging: 'KRAFT'
  });

  const spec = buildSpec(productId, picks);

  /* The hidden field carries the specification; the message field carries
     the readable version. Both are updated on every change so the buyer
     can see the summary change as they click. */
  function apply(next: Record<string, string>) {
    setPicks(next);

    const specEl = document.getElementById(SPEC_FIELD) as HTMLInputElement | null;
    if (specEl) specEl.value = buildSpec(productId, next);

    const msgEl = document.getElementById(messageFieldId) as HTMLTextAreaElement | null;
    if (msgEl) msgEl.value = buildMessage(productId, productName, next);
  }

  return (
    <div className="spec">
      <div className="spec-h">Inquiry builder</div>

      {BUILDER_GROUPS.map((g) => (
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
