'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * The interactive half of a product page: the gallery with its zoom.
 *
 * Client-side because of the interaction. Everything else on the page is
 * server rendered, so the HTML a crawler sees already contains the product
 * name, the price, the specifications and the customisation options — none
 * of that depends on this running.
 *
 * There is no full-screen viewer. There was one, and it covered the whole
 * page: the photograph opened over everything, and the way out of it was a
 * small button in the corner that was almost impossible to find, so a
 * buyer who opened the picture was left looking at a photograph they could
 * not get back from. The zoom inside the frame does the same job — the
 * buyer follows the pointer across the dial and reads the finish and the
 * numerals — without anything appearing that was not already on the page.
 */

type Shot = {
  url: string;
  /* 640px copy of the same photo, when one exists. Null on images uploaded
     before thumbnails did — every caller falls back to `url`. */
  thumbUrl?: string | null;
  /* 1024px tier for the srcset below. */
  thumbLgUrl?: string | null;
  alt: string;
  kind?: string;
};

export function ProductGallery({ name, images }: { name: string; images: Shot[] }) {
  const [zoom, setZoom] = useState(false);
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
          <div className="pd-main-btn">
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
              /* Three tiers, and the middle one is not optional. This frame
                 zooms to 1.75x and opens full-screen, so a desktop wants the
                 original — but with only 640w and 2048w on offer, a 390px
                 phone at 2x needs ~718 device pixels, finds nothing close,
                 and takes the next candidate up: the 954 KB original, for an
                 image shown 356 CSS px wide. The 1024w tier is what the
                 phone actually wants. Measured 751 KB before this line. */
              {...(current.thumbUrl
                ? {
                    srcSet: [
                      `${current.thumbUrl} 640w`,
                      current.thumbLgUrl ? `${current.thumbLgUrl} 1024w` : null,
                      `${current.url} 2048w`
                    ]
                      .filter(Boolean)
                      .join(', '),
                    sizes: '(max-width: 900px) 92vw, 620px'
                  }
                : {})}
              decoding="async"
            />
          </div>
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

        {current && canHover ? <span className="pd-zoom-hint">Hover to zoom</span> : null}
      </div>
    </div>
  );
}
