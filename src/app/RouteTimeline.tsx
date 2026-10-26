/**
 * The 28-day route.
 *
 * The specification draws this as a horizontal strip — Day 01 to Day 28
 * running left to right along the bottom of the anatomy module — and a
 * calendar reads that way. A buyer planning a launch wants to know
 * where the order sits on the line, and a line going sideways answers
 * that at a glance; the same six stages stacked vertically is a list,
 * and a list has to be read rather than seen.
 *
 * The strip is on one row on a desktop, wraps to two rows on a tablet
 * and becomes a vertical column on a phone, where a six-column strip
 * would leave each column about fifty pixels wide.
 */

import { ROUTE_28 } from '@/lib/vocabulary';

export function RouteTimeline() {
  return (
    <div className="route" role="list">
      {ROUTE_28.map((r, i) => (
        <div className="route-i" role="listitem" key={r.day}>
          {/* The connector between stages. It is drawn rather than
              inserted as an element, so the strip reads as one line
              with markers on it rather than as six separate cards
              with arrows between them. */}
          <span className="route-node" aria-hidden="true" />
          {i < ROUTE_28.length - 1 && (
            <span className="route-line" aria-hidden="true" />
          )}
          <div className="route-day tnum">{r.day}</div>
          <h4 className="route-title">{r.title}</h4>
          <p className="route-detail">{r.detail}</p>
        </div>
      ))}
    </div>
  );
}
