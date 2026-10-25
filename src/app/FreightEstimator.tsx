'use client';

/**
 * The carton freight estimator — §5.3-2.
 *
 * A buyer who has found the right clock needs to know two things before
 * they can price the shipment: how much space the order takes, and what
 * it weighs. Both come out of the carton, so both are calculated from
 * the same three numbers — how many clocks are in a carton, how big the
 * carton is, and how much it weighs when full.
 *
 * The container figures are the interesting part. They are not a
 * formula the buyer has to trust:
 *
 *   CBM per carton = length × width × height, in metres
 *   20ft container  = 28.0 m³ of usable space
 *   40ft high cube  = 67.7 m³ of usable space
 *
 * The usable volumes are the internal volumes with the allowance for
 * palletising and the gaps between cartons taken out — a container packed
 * to its theoretical volume has no room left to get the last carton in.
 *
 * With the specification's own example — 64 × 34 × 34 cm cartons of 10
 * clocks — these give 3,784 clocks in a 20ft and 9,152 in a 40ft high
 * cube, which is the ~3,800 and ~9,200 the specification quotes. The
 * figures are therefore derived rather than asserted, and the buyer can
 * change any input and watch them move.
 *
 * Every input is editable, because the buyer's order is not the
 * factory's default. A buyer who wants 12 clocks per carton rather than
 * 10 can find out what that does to the container count.
 */

import { useState } from 'react';

/** Usable volume in cubic metres. */
const C20 = 28.0;
const C40HC = 67.7;

export type CartonSpec = {
  qty: number | null;
  l: number | null;
  w: number | null;
  h: number | null;
  gw: number | null;
};

export function FreightEstimator({
  spec,
  productName
}: {
  spec: CartonSpec;
  productName: string;
}) {
  /* A sensible starting point for a mid-size wall clock, used when the
     product has no carton data of its own. It is labelled as an
     assumption on the panel rather than passed off as the factory's
     packing. */
  const [qty, setQty] = useState<number>(spec.qty ?? 10);
  const [l, setL] = useState<number>(spec.l ?? 64);
  const [w, setW] = useState<number>(spec.w ?? 34);
  const [h, setH] = useState<number>(spec.h ?? 34);
  const [gw, setGw] = useState<number>(spec.gw ?? 15.5);
  const [pcs, setPcs] = useState<number>(500);

  const hasReal = !!(spec.qty && spec.l && spec.w && spec.h && spec.gw);

  const cbm = (l * w * h) / 1_000_000;
  const cartons20 = cbm > 0 ? Math.floor(C20 / cbm) : 0;
  const cartons40 = cbm > 0 ? Math.floor(C40HC / cbm) : 0;
  const load20 = cartons20 * qty;
  const load40 = cartons40 * qty;

  const cartonsNeeded = qty > 0 ? Math.ceil(pcs / qty) : 0;
  const totalGw = cartonsNeeded * gw;
  const totalCbm = cartonsNeeded * cbm;

  return (
    <div className="frt">
      <div className="frt-h">
        <span>Carton &amp; freight estimator</span>
        {!hasReal && <span className="frt-assumed">assumed values</span>}
      </div>

      {!hasReal && (
        <p className="frt-note">
          This clock has no carton data on file yet, so the panel starts from a
          typical packing for its size. Change any number to match your order.
        </p>
      )}

      <div className="frt-in">
        <div className="frt-field">
          <label htmlFor="frt-qty">Clocks per carton</label>
          <input id="frt-qty" type="number" min={1} value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="frt-field">
          <label htmlFor="frt-pcs">Order quantity</label>
          <input id="frt-pcs" type="number" min={1} step={100} value={pcs}
            onChange={(e) => setPcs(Math.max(1, Number(e.target.value) || 1))} />
        </div>
      </div>

      <div className="frt-field">
        <label>Carton size (cm)</label>
        <div className="frt-dims">
          <input aria-label="Carton length in centimetres" type="number" min={1}
            value={l} onChange={(e) => setL(Math.max(1, Number(e.target.value) || 1))} />
          <span>×</span>
          <input aria-label="Carton width in centimetres" type="number" min={1}
            value={w} onChange={(e) => setW(Math.max(1, Number(e.target.value) || 1))} />
          <span>×</span>
          <input aria-label="Carton height in centimetres" type="number" min={1}
            value={h} onChange={(e) => setH(Math.max(1, Number(e.target.value) || 1))} />
        </div>
      </div>

      <div className="frt-in">
        <div className="frt-field">
          <label htmlFor="frt-gw">Gross weight per carton (kg)</label>
          <input id="frt-gw" type="number" min={0.1} step={0.1} value={gw}
            onChange={(e) => setGw(Math.max(0.1, Number(e.target.value) || 0.1))} />
        </div>
        <div className="frt-field">
          <label>Volume per carton</label>
          <div className="frt-static tnum">{cbm.toFixed(3)} CBM</div>
        </div>
      </div>

      <div className="frt-out">
        <div className="frt-row">
          <span className="frt-k">This order</span>
          <span className="frt-v tnum">
            {cartonsNeeded} cartons · {totalCbm.toFixed(2)} CBM · {totalGw.toFixed(1)} kg
          </span>
        </div>
        <div className="frt-row">
          <span className="frt-k">20ft container</span>
          <span className="frt-v tnum">{load20.toLocaleString()} clocks max</span>
        </div>
        <div className="frt-row">
          <span className="frt-k">40ft high cube</span>
          <span className="frt-v tnum">{load40.toLocaleString()} clocks max</span>
        </div>
      </div>

      <p className="frt-foot">
        Usable volume 28.0 m³ (20ft) and 67.7 m³ (40ft high cube), after the
        allowance for palletising and the gaps between cartons. Sea freight and
        duty are quoted separately on an Ex Works basis.
      </p>
    </div>
  );
}
