'use client';

/**
 * The anatomy module and the delivery route.
 *
 * Two pieces, so that a page can use the parts it needs:
 *
 *   AnatomyHeading — the kicker, the title and the paragraph
 *   RouteSection   — the 28-day calendar
 *
 * The custom-services page is where these live. The home page's
 * customizer hub carries the four decisions a buyer makes and the
 * specification they assemble into; the anatomy answers "here is what
 * each of those parts is, and here is what else you could change", and
 * the calendar answers "what happens next" — both of which are a
 * subject in their own right rather than an aside to a configurator.
 *
 * So the home page links here and the topic page carries the detail.
 * Both read from the same components, so a buyer who lands on either
 * page reads the same engineering claims in the same words.
 */

import { RouteTimeline } from './RouteTimeline';

/** The kicker, the title and the paragraph. */
export function AnatomyHeading() {
  return (
    <>
      {/* The kicker and the title are two lines of the same heading
          rather than two elements: the specification writes them side
          by side, and a buyer reading the section should see them as
          one thing. */}
      <div className="anx-head">
        <span className="anx-head-k">// Custom services &amp; anatomy</span>
        <span className="anx-head-s">Modular component deconstruction</span>
      </div>
      <h2 className="anx-title">6 Core Modular Components: Complete OEM Freedom</h2>
      <p className="anx-lede">
        Every wall clock produced in our Xiamen facility is engineered as a
        modular system. Frames, dials, hands, movements and packaging are
        chosen separately, and the case is tooled to hold whichever
        combination of them is asked for.
      </p>
    </>
  );
}

/** The 28-day calendar. */
export function RouteSection() {
  return (
    <div className="anx-route">
      <div className="sec-head">
        <div className="sec-tag">// Agile manufacturing timeline</div>
        <h2>Twenty-eight days from drawing to container</h2>
        <p className="sec-sub">
          A fixed calendar, not an estimate. A buyer planning a launch needs to
          know when the goods leave the port, so every stage has a date on it.
        </p>
      </div>

      <RouteTimeline />
    </div>
  );
}
