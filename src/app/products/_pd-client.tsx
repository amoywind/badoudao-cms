'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { OptionGroup } from '@/lib/product-detail';

/**
 * The interactive half of a product page: gallery with zoom and lightbox,
 * and the customisation pickers.
 *
 * Client-side because all of it is interaction. The buyer's selections
 * travel to the inquiry form rather than to the server — a wholesale quote
 * needs a conversation about quantity and artwork, not a cart, so the
 * picks are carried in the URL-free state of this component and appended to
 * the inquiry message. Submitting them as hidden fields would put them in
 * the POST body where nobody reads them.
 */

type Shot = { url: string; alt: string; kind?: string };

/* Placeholders for the five angles a buyer asks for. A blank frame with a
   caption telling the owner what to shoot is more useful than an empty
   square: it is a work list. */
const SHOT_PLAN = [
  { kind: 'back', label: 'Back structure' },
  { kind: 'movement', label: 'Movement' },
  { kind: 'packaging', label: 'Packaging' },
  { kind: 'detail', label: 'Dial detail' }
];

export function ProductGallery({ name, images }: { name: string; images: Shot[] }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const frameRef = useRef<HTMLDivElement>(null);

  const shots = images.length ? images : [];

  /* Hover zoom follows the pointer: a fixed centre zoom only helps when
     the detail happens to be in the middle, and for a dial that is rarely
     where a buyer is looking. */
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }, []);

  const close = useCallback(() => setLightbox(false), []);

  /* Arrow keys move between shots, and Escape closes. A phone needs the
     scroll lock too — without it the page behind the overlay scrolls under
     your thumb while you are trying to swipe between photos. */
  const step = useCallback((d: number) => {
    if (!shots.length) return;
    setActive((i) => (i + d + shots.length) % shots.length);
  }, [shots.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, close, step]);

  const current = shots[active];

  return (
    <div className="pd-gallery">
      {/* 1:1 keeps a round dial circular. A 4:3 frame renders a square clock
          as an oval, which reads as a distortion of the product. */}
      <div
        ref={frameRef}
        className={`pd-main${zoom && current ? ' zoom' : ''}`}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMove}
      >
        {current ? (
          <button
            type="button"
            className="pd-main-btn"
            onClick={() => setLightbox(true)}
            aria-label={`Enlarge ${name} photo`}
          >
            <img
              src={current.url}
              alt={current.alt || name}
              width={1200}
              height={1200}
              style={{ transformOrigin: origin }}
              fetchPriority="high"
            />
          </button>
        ) : (
          <div className="pd-shot-missing main">
            <strong>No product photo yet</strong>
            <p>
              This page needs one front-on shot. Until it is uploaded the
              gallery shows what to shoot rather than a blank square.
            </p>
            <ul>
              {SHOT_PLAN.map((p) => (
                <li key={p.kind}>{p.label}</li>
              ))}
            </ul>
          </div>
        )}

        {current ? <span className="pd-zoom-hint">Click to enlarge</span> : null}
      </div>

      {(shots.length > 1 || !shots.length) && (
        <div className="pd-thumbs">
          {shots.map((s, i) => (
            <button
              key={s.url + i}
              type="button"
              className={`pd-thumb${i === active ? ' on' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}: ${s.alt || s.kind || name}`}
              aria-current={i === active}
            >
              <img src={s.url} alt={s.alt || ''} width={160} height={160} loading="lazy" />
              {s.kind ? <span className="pd-thumb-t">{s.kind}</span> : null}
            </button>
          ))}

          {!shots.length &&
            SHOT_PLAN.map((p) => (
              <div key={p.kind} className="pd-thumb pd-thumb-empty" aria-hidden="true">
                <span>{p.label}</span>
              </div>
            ))}
        </div>
      )}

      {lightbox && current && (
        <div className="pd-lightbox" role="dialog" aria-modal="true" aria-label={`${name} photos`}>
          <button type="button" className="pd-lb-close" onClick={close} aria-label="Close">×</button>

          {shots.length > 1 && (
            <button type="button" className="pd-lb-nav prev" onClick={() => step(-1)} aria-label="Previous">‹</button>
          )}

          <img src={current.url} alt={current.alt || name} width={1200} height={1200} />

          {shots.length > 1 && (
            <button type="button" className="pd-lb-nav next" onClick={() => step(1)} aria-label="Next">›</button>
          )}

          <div className="pd-lb-foot">
            <span>{active + 1} / {shots.length}</span>
            {current.kind ? <span className="pd-lb-kind">{current.kind}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CustomisationPicker({
  groups,
  moq
}: {
  groups: OptionGroup[];
  moq: number;
}) {
  /* Default the movement to silent sweep: it is the one buyers pick most
     often for home and hospitality, and starting from nothing makes the
     group read as "not yet specified" rather than as a choice. */
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of groups) init[g.key] = [];
    const sweep = groups.find((g) => g.key === 'movement');
    if (sweep) init.movement = [sweep.values[1]];
    return init;
  });

  function toggle(key: string, value: string, multi: boolean) {
    setPicked((p) => {
      const cur = p[key] || [];
      if (!multi) return { ...p, [key]: [value] };
      return {
        ...p,
        [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      };
    });
  }

  /* Frame, hands, dial, printing and movement are one choice each: a clock
     has one frame. Printing and packaging can take more than one, because
     a buyer does sometimes want both a silk screen and a laser pass. */
  const MULTI = new Set(['printing', 'packaging']);

  const summary = Object.entries(picked)
    .filter(([, v]) => v.length)
    .map(([k, v]) => {
      const g = groups.find((x) => x.key === k);
      return g ? `${g.label}: ${v.join(', ')}` : null;
    })
    .filter(Boolean)
    .join('\n');

  return (
    <div className="pd-custom">
      <div className="pd-custom-head">
        <h3>Configure your order</h3>
        <p>
          Pick what applies. Nothing is binding — this only tells us what to
          quote, and we confirm feasibility before you commit.
        </p>
      </div>

      {groups.map((g) => {
        const multi = MULTI.has(g.key);
        const cur = picked[g.key] || [];
        return (
          <fieldset key={g.key} className="pd-opgroup">
            <legend>
              <span aria-hidden="true">{g.icon}</span> {g.label}
              {cur.length > 0 && <em>{cur.length} selected</em>}
            </legend>
            <div className="pd-opvals">
              {g.values.map((v) => {
                const on = cur.includes(v);
                return (
                  <label key={v} className={`pd-op${on ? ' on' : ''}`}>
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`opt-${g.key}`}
                      value={v}
                      checked={on}
                      onChange={() => toggle(g.key, v, multi)}
                    />
                    <span>{v}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* Carries the selection into the inquiry rather than posting it
          separately: a quote needs the numbers discussed, so the message is
          the channel and a hidden field would only duplicate it. */}
      <input type="hidden" name="configuration" value={summary.replace(/\n/g, '; ')} />

      <p className="pd-custom-note">
        MOQ {moq} pcs applies per design. Mixed designs are welcome as long as
        the total meets the minimum.
      </p>
    </div>
  );
}