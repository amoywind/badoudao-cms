'use client';

/**
 * The six modular components — the exploded view.
 *
 * The argument this makes is that a clock is six decisions rather than
 * one. A buyer who thinks of a clock as a single object also thinks of
 * it as a single thing that can be swapped, and the objection that
 * comes back is "can I have a metal frame with a plastic back and a
 * brass hand?" — which the factory can, and which this page shows
 * rather than asserts.
 *
 * HOW IT WORKS
 *
 * The diagram on the left is one drawing with six clickable layers.
 * Clicking a layer selects it, the selected layer lifts and brightens,
 * and the panel on the right changes to that layer's engineering
 * detail. The part tabs under the diagram are the same selection in
 * another form, because a buyer scrolling with a mouse wants to click
 * the drawing and a buyer on a phone wants to tap a row.
 *
 * The layers are drawn as an exploded assembly: the lens above the
 * frame, the hands above the dial, the movement behind, the backplate
 * furthest away. Each layer is offset along the vertical axis, so the
 * separation reads as depth rather than as a list.
 *
 * WHY THE PANEL CARRIES NUMBERS
 *
 * The materials are not the argument — every factory says it can run
 * brass and acrylic. The tolerances are: 1.5mm of clearance between
 * the hands, 0.05g of balance on a hand set, ΔE below 1.0 on a print,
 * 100% aged for 24 hours. Those are the numbers a buyer checks, and
 * they are the difference between a claim and a specification.
 */

import { useState } from 'react';
import { COMPONENTS } from '@/lib/anatomy-data';

export function AnatomyExplorer() {
  const [active, setActive] = useState(3); /* the dial — the part with the most to say */

  const part = COMPONENTS[active];

  return (
    <div className="anx">
      {/* ---- the exploded assembly ---- */}
      <div className="anx-diagram">
        <svg
          className="anx-svg"
          viewBox="0 0 420 430"
          role="img"
          aria-label="Exploded view of the six components of a wall clock"
        >
          <defs>
            <filter id="anx-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="anx-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9AA3AE" />
              <stop offset="100%" stopColor="#5C6570" />
            </linearGradient>
          </defs>

          {/* Layer 6 — the backplate, furthest back. */}
          <g
            className={`anx-l${active === 5 ? ' on' : ''}`}
            onClick={() => setActive(5)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive(5); }}
          >
            <ellipse cx="210" cy="352" rx="96" ry="34" fill="#2C3138" opacity="0.95" />
            <rect x="192" y="336" width="36" height="26" rx="4" fill="#1A1E24" />
            <text x="210" y="353" textAnchor="middle" fontSize="7" fill="#7A828D"
              fontFamily="var(--font-tech), monospace">BATTERY</text>
          </g>

          {/* Layer 5 — the movement, behind the dial. */}
          <g
            className={`anx-l${active === 4 ? ' on' : ''}`}
            onClick={() => setActive(4)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive(4); }}
          >
            <circle cx="210" cy="268" r="62" fill="#EDF0F3" stroke="#C9CFD6" strokeWidth="1.5" />
            <circle cx="210" cy="268" r="46" fill="none" stroke="#D6DBE1" strokeWidth="1" />
            {/* The gear train, drawn as a hint of what is behind the
                dial rather than as an engineering drawing. */}
            <circle cx="210" cy="268" r="30" fill="none" stroke="#B9C0C8" strokeWidth="2" />
            <circle cx="210" cy="268" r="14" fill="none" stroke="#A7AEB7" strokeWidth="2" />
            <circle cx="210" cy="268" r="5" fill="#B8874A" />
            {[0, 60, 120, 180, 240, 300].map((a) => {
              const rad = (a * Math.PI) / 180;
              return (
                <circle
                  key={a}
                  cx={210 + Math.cos(rad) * 38}
                  cy={268 + Math.sin(rad) * 38}
                  r="6"
                  fill="#C4CBD3"
                />
              );
            })}
          </g>

          {/* Layer 4 — the custom dial. */}
          <g
            className={`anx-l${active === 3 ? ' on' : ''}`}
            onClick={() => setActive(3)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive(3); }}
          >
            <circle cx="210" cy="196" r="96" fill="#FFFFFF" stroke="#111111" strokeWidth="2.5" />
            {Array.from({ length: 60 }).map((_, i) => {
              const major = i % 5 === 0;
              const a = (i * 6 * Math.PI) / 180;
              const r1 = major ? 78 : 86;
              return (
                <line
                  key={i}
                  x1={210 + Math.sin(a) * r1}
                  y1={196 - Math.cos(a) * r1}
                  x2={210 + Math.sin(a) * 92}
                  y2={196 - Math.cos(a) * 92}
                  stroke={major ? '#111111' : '#C9CDD3'}
                  strokeWidth={major ? 2 : 1}
                />
              );
            })}
            {/* The artwork area, marked the way a dial's print area is
                marked on a production drawing. */}
            <circle cx="210" cy="196" r="62" fill="none" stroke="#0052CC" strokeWidth="1"
              strokeDasharray="4,3" opacity="0.5" />
            <text x="210" y="176" textAnchor="middle" fontSize="7" fill="#111111"
              fontFamily="var(--font-tech), monospace" fontWeight="700" letterSpacing="0.8">
              OEMWALLCLOCKS
            </text>
            <text x="210" y="187" textAnchor="middle" fontSize="5" fill="#8A9199"
              fontFamily="var(--font-tech), monospace">
              PRINT AREA · ΔE &lt; 1.0
            </text>
            {/* The hands, so the dial reads as a dial. */}
            <line x1="210" y1="196" x2="210" y2="140" stroke="#111111" strokeWidth="4"
              strokeLinecap="round" transform="rotate(35 210 196)" />
            <line x1="210" y1="196" x2="210" y2="118" stroke="#3d4450" strokeWidth="3"
              strokeLinecap="round" transform="rotate(120 210 196)" />
            <circle cx="210" cy="196" r="4" fill="#B8874A" />
          </g>

          {/* Layer 3 — the hands, lifted above the dial. */}
          <g
            className={`anx-l${active === 2 ? ' on' : ''}`}
            onClick={() => setActive(2)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive(2); }}
          >
            <line x1="150" y1="126" x2="270" y2="126" stroke="#C59B27" strokeWidth="4"
              strokeLinecap="round" />
            <line x1="150" y1="112" x2="262" y2="112" stroke="#C59B27" strokeWidth="3"
              strokeLinecap="round" />
            <line x1="150" y1="100" x2="286" y2="100" stroke="#0052CC" strokeWidth="1.6"
              strokeLinecap="round" />
            <circle cx="288" cy="100" r="3.5" fill="#0052CC" />
            {/* The clearance dimension, which is the number the panel
                quotes. Showing it on the drawing is what makes the
                number mean something. */}
            <line x1="150" y1="112" x2="150" y2="126" stroke="#D97706" strokeWidth="1"
              strokeDasharray="2,2" />
            <text x="144" y="122" textAnchor="end" fontSize="7" fill="#D97706"
              fontFamily="var(--font-tech), monospace">≥1.5</text>
          </g>

          {/* Layer 2 — the lens cover, above everything. */}
          <g
            className={`anx-l${active === 1 ? ' on' : ''}`}
            onClick={() => setActive(1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive(1); }}
          >
            <circle cx="210" cy="196" r="104" fill="#E8F0FC" opacity="0.4" />
            <circle cx="210" cy="196" r="104" fill="none" stroke="#0052CC" strokeWidth="1.4"
              strokeDasharray="5,4" opacity="0.75" />
            {/* The reflection across the glass. */}
            <path d="M150 120 A104 104 0 0 1 270 120 L196 262 A104 104 0 0 0 150 120 Z"
              fill="#FFFFFF" opacity="0.28" />
            <text x="210" y="98" textAnchor="middle" fontSize="6.5" fill="#0052CC"
              fontFamily="var(--font-tech), monospace" letterSpacing="0.5">
              AR · &gt;96% T
            </text>
          </g>

          {/* Layer 1 — the outer frame, the outermost ring. */}
          <g
            className={`anx-l${active === 0 ? ' on' : ''}`}
            onClick={() => setActive(0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive(0); }}
          >
            <circle cx="210" cy="196" r="112" fill="none" stroke="url(#anx-metal)" strokeWidth="9" />
            <circle cx="210" cy="196" r="112" fill="none" stroke="#111111" strokeWidth="1" opacity="0.25" />
          </g>

          {/* The callouts. They sit outside the drawing so the assembly
              is not crowded by its own labels. */}
          {[
            { i: 0, x: 26, y: 92, anchor: 'start' },
            { i: 1, x: 386, y: 122, anchor: 'end' },
            { i: 2, x: 210, y: 76, anchor: 'middle' },
            { i: 3, x: 210, y: 196, anchor: 'middle', inside: true },
            { i: 4, x: 386, y: 268, anchor: 'end' },
            { i: 5, x: 210, y: 392, anchor: 'middle' }
          ].map((c) => {
            const on = active === c.i;
            if (c.inside) return null;
            const label = COMPONENTS[c.i].label.toUpperCase();
            return (
              <g key={c.i} className={`anx-callout${on ? ' on' : ''}`}>
                <text
                  x={c.x}
                  y={c.y}
                  textAnchor={c.anchor as 'start' | 'end' | 'middle'}
                  fontSize="8.5"
                  fontFamily="var(--font-tech), monospace"
                  letterSpacing="0.4"
                >
                  {c.i + 1}. {label}
                </text>
              </g>
            );
          })}
        </svg>

        <p className="anx-hint">
          Click any component above to inspect engineering tolerances
        </p>

        {/* The part tabs — the same selection as the drawing, for a
            buyer who would rather tap a row than aim at a shape. */}
        <div className="anx-tabs" role="tablist" aria-label="Component">
          {COMPONENTS.map((c, i) => (
            <button
              key={c.n}
              type="button"
              role="tab"
              aria-selected={active === i}
              className={`anx-tab${active === i ? ' on' : ''}`}
              onClick={() => setActive(i)}
            >
              Part {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      {/* ---- the engineering panel ---- */}
      <div className="anx-panel">
        <div className="anx-kicker">
          Component deconstruction // part {part.n.padStart(2, '0')}
        </div>
        <h3 className="anx-h">{part.n}. {part.name}</h3>
        <div className="anx-cn">{part.cn}</div>
        <p className="anx-sum">{part.summary}</p>

        <div className="anx-specs">
          <div className="anx-spec">
            <div className="anx-spec-l">Material capabilities</div>
            <p>{part.materials}</p>
          </div>
          <div className="anx-spec">
            <div className="anx-spec-l">Dimension &amp; tolerances</div>
            <p>{part.tolerances}</p>
          </div>
          <div className="anx-spec">
            <div className="anx-spec-l">Factory surface craft</div>
            <p>{part.craft}</p>
          </div>
        </div>

        <div className="anx-special">
          <div className="anx-special-l">Specialized non-standard architectures</div>
          {part.special.map((s) => (
            <div className="anx-special-i" key={s.title}>
              <span className="anx-check">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M7 12l3.5 3.5L17 9" />
                </svg>
              </span>
              <span>
                <strong>{s.title}:</strong> {s.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
