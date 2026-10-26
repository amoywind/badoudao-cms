/**
 * The sample and prototyping policy.
 *
 * Three facts a buyer needs before they can order, and none of them are
 * obvious: what one sample costs, whether the money comes back, and how
 * long it takes to arrive.
 *
 * It sits directly under the price on the product page because that is
 * where the question arises. A buyer reading "$8.50–12.20 per piece,
 * MOQ 300" is doing arithmetic — three hundred of those is more than
 * they want to risk on a design they have not seen. The answer to that
 * arithmetic is on the same screen.
 */

/** The policy itself. Kept as data so the page and the customizer hub
    cannot say different things about it. */
export const SAMPLE_POLICY = {
  fee: '$50.00 – $80.00 / pc',
  feeNote:
    'Includes 1:1 custom logo, selected hands/movement, and 3D rendering confirmation.',
  refund:
    '100% fee refundable — the sample cost is credited back to your total invoice once the official mass order (MOQ 300+ pcs) is placed.',
  lead: '5–7 business days',
  leadNote: 'Sample dispatch via DHL / FedEx / UPS express.'
};

export function SamplePolicy({ compact = false }: { compact?: boolean }) {
  if (compact) {
    /* The compact form goes under the customizer hub's summary, where a
       buyer has just built a specification and is deciding whether to
       see it made before ordering three hundred of them. */
    return (
      <div className="sp-card sp-compact">
        <div className="sp-row">
          <span className="sp-k">Custom sample</span>
          <span className="sp-v">{SAMPLE_POLICY.fee}</span>
        </div>
        <p className="sp-note">{SAMPLE_POLICY.refund}</p>
      </div>
    );
  }

  return (
    <div className="sp-card">
      <div className="sp-head">
        <span className="sp-tag">Sample &amp; prototyping policy</span>
      </div>

      <div className="sp-rows">
        <div className="sp-row">
          <span className="sp-k">Custom sample fee</span>
          <span className="sp-v">{SAMPLE_POLICY.fee}</span>
        </div>
        <p className="sp-note">{SAMPLE_POLICY.feeNote}</p>

        <div className="sp-row">
          <span className="sp-k">Fee refundable</span>
          <span className="sp-v sp-v-good">100%</span>
        </div>
        <p className="sp-note">{SAMPLE_POLICY.refund}</p>

        <div className="sp-row">
          <span className="sp-k">Lead time</span>
          <span className="sp-v">{SAMPLE_POLICY.lead}</span>
        </div>
        <p className="sp-note">{SAMPLE_POLICY.leadNote}</p>
      </div>
    </div>
  );
}
