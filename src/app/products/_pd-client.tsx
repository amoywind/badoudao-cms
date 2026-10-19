'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { GroupIcon } from '@/lib/product-detail';
import { GroupGlyph } from './_icons';

/**
 * The interactive half of a product page: the gallery with its zoom and
 * lightbox.
 *
 * Client-side because of the interaction. Everything else on the page is
 * server rendered, so the HTML a crawler sees already contains the product
 * name, the price, the specifications and the customisation list — none of
 * that depends on this running.
 */

type Shot = {
  url: string;
  /* 640px copy of the same photo, when one exists. Null on images uploaded
     before thumbnails did — every caller falls back to `url`. */
  thumbUrl?: string | null;
  alt: string;
  kind?: string;
};

export function ProductGallery({ name, images }: { name: string; images: Shot[] }) {
  const [zoom, setZoom] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const frameRef = useRef<HTMLDivElement>(null);

  /* Whether the pointer can hover at all.

     A tap on a touchscreen also fires mouseenter, and because there is no
     mouseleave until you touch somewhere else, the photo stayed scaled to
     1.75 under the lightbox and after it closed — on a phone, where the
     zoom cannot be used anyway because a finger is on the glass. The hint
     and the zoom both follow this. */
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const shots = images.length ? images : [];
  const current = shots[0];

  /* Hover zoom follows the pointer: a fixed centre zoom only helps when
     the detail happens to be in the middle, and for a dial that is rarely
     where a buyer is looking. */
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setOrigin(
      `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`
    );
  }, []);

  const close = useCallback(() => setLightbox(false), []);

  useEffect(() => {
    if (!lightbox) return;
    /* Escape closes, and the scroll lock stops the page behind the overlay
       moving under your thumb while you are trying to look at the photo. */
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, close]);

  return (
    <div className="pd-gallery">
      {/* Square, not 4:3. A round dial in a wide frame renders as an oval,
          which reads as a distortion of the product rather than as a framed
          photograph. */}
      <div
        ref={frameRef}
        className={`pd-main${zoom && current ? ' zoom' : ''}`}
        onMouseEnter={() => { if (canHover) setZoom(true); }}
        onMouseLeave={() => { if (canHover) setZoom(false); }}
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
              src={current.thumbUrl || current.url}
              alt={current.alt || name}
              width={1200}
              height={1200}
              style={{ transformOrigin: origin }}
              /* Lowercase via a spread. This was written as fetchPriority
                 and React 18 rendered it verbatim, casing intact — not the
                 HTML attribute, so the browser ignored it and the product
                 photo, the largest thing on the page, was never actually
                 prioritised. tsc only accepts the camelCase spelling, which
                 is the one that does not work at runtime. */
              {...{ fetchpriority: 'high' }}
              /* This frame zooms to 1.75x on hover and opens full-screen in
                 the lightbox, so on a wide screen the original is the right
                 file — but it is 954 KB, and a phone never renders more than
                 the 640px copy. srcset lets the browser decide: phones take
                 the thumbnail, desktops take the full-resolution shot when
                 they are about to zoom into it. */
              {...(current.thumbUrl
                ? {
                    srcSet: `${current.thumbUrl} 640w, ${current.url} 2048w`,
                    sizes: '(max-width: 900px) 92vw, 620px'
                  }
                : {})}
              decoding="async"
            />
          </button>
        ) : (
          /* Where a photo is missing, say so. A blank square reads as a
             broken image. */
          <div className="pd-shot-missing">
            <strong>No product photo yet</strong>
            <p>
              One front-on shot fills this frame. Until it is uploaded the
              gallery says so rather than showing an empty square.
            </p>
          </div>
        )}

        {current ? <span className="pd-zoom-hint">Click to enlarge</span> : null}
      </div>

      {lightbox && current ? (
        <div className="pd-lightbox" role="dialog" aria-modal="true" aria-label={`${name} photo`}>
          <button type="button" className="pd-lb-close" onClick={close} aria-label="Close">×</button>
          <img src={current.url} alt={current.alt || name} width={1200} height={1200} />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The customisation list, as read-only rows.
 *
 * Not a picker. A visitor cannot order from this page — a wholesale quote
 * needs a conversation about quantity and artwork — so a set of controls
 * implies they can commit to a configuration here, and they cannot. What
 * belongs here is what the factory actually offers on this model, and the
 * owner chooses that per product in the admin.
 *
 * Rows rather than chips: a chip per value turns six groups into forty
 * pills and buries the groups. A row reads as "this model, this
 * specification" in one line.
 */
export function CustomisationList({
  groups
}: {
  groups: { key: string; label: string; icon: GroupIcon; values: string[] }[];
}) {
  /* Groups the owner ticked nothing for are dropped. An empty heading with
     nothing under it reads as a broken section rather than an absent one. */
  const shown = groups.filter((g) => g.values.length > 0);
  if (!shown.length) return null;

  return (
    <section className="pd-custom" aria-label="Customisation options">
      <h3 className="pd-custom-h">Customisation available</h3>
      <div className="pd-custom-rows">
        {shown.map((g) => (
          <div key={g.key} className="pd-cr">
            <span className="pd-cr-i">
              <GroupGlyph name={g.icon} />
              {g.label}
            </span>
            <span className="pd-cr-v">{g.values.join(' · ')}</span>
          </div>
        ))}
      </div>
      <p className="pd-custom-note">
        Tell us which combination you need and we quote it. Nothing here binds
        either side until we confirm feasibility.
      </p>
    </section>
  );
}