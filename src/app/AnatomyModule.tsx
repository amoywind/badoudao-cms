/**
 * The anatomy module and the delivery route.
 *
 * The specification places both on the home page: the exploded
 * anatomy is the argument for customisation, and the 28-day calendar
 * is the argument that a small order will not drag. They belong
 * together — the first says what can be built, the second says how
 * long it takes.
 *
 * They are in one component because they travel together. The
 * custom-services page renders the same block, so a buyer who lands
 * there and a buyer who lands on the home page read the same
 * engineering claims in the same words.
 */

import { AnatomyExplorer } from './AnatomyExplorer';
import { RouteTimeline } from './RouteTimeline';

export function AnatomyModule() {
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

      <AnatomyExplorer />

      {/* The 28-day route. It sits under the anatomy because the two
          make one argument: the parts can be mixed because the
          factory knows how to build each of them, and the calendar
          says how long that takes. */}
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
    </>
  );
}
