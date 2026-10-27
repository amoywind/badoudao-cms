'use client';

/**
 * The anatomy module and the delivery route.
 *
 * Three pieces, so that a page can use the parts it needs:
 *
 *   AnatomyHeading  — the kicker, the title and the paragraph
 *   AnatomyExplorer — the exploded drawing and the engineering panel
 *   AnatomyModule   — the heading, the explorer and the calendar
 *
 * The customizer hub on the home page takes the whole module: a buyer
 * who has just chosen a housing wants to know what else they could
 * have chosen, and the 28-day calendar answers what happens next.
 *
 * The custom-services page takes the heading and the explorer as
 * separate sections, because there the anatomy is the subject of the
 * page rather than an aside to a configurator.
 *
 * All three read from the same components, so a buyer who lands on
 * either page reads the same engineering claims in the same words.
 */

import { AnatomyExplorer } from './AnatomyExplorer';
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
        modular system. Mix and match frames, dials, clock hands, movements,
        and packaging with zero compromise on structural integrity.
      </p>
    </>
  );
}

/** The exploded drawing and the engineering panel beside it. */
export function AnatomyExplorerBlock() {
  return <AnatomyExplorer />;
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

/** The whole module: the heading, the drawing and the calendar. */
export function AnatomyModule() {
  return (
    <>
      <AnatomyHeading />

      <AnatomyExplorer />

      {/* The 28-day route. It sits under the anatomy because the two
          make one argument: the parts can be mixed because the
          factory knows how to build each of them, and the calendar
          says how long that takes. */}
      <RouteSection />
    </>
  );
}
