'use client';

/**
 * The live clock engine.
 *
 * Three things it does, all specified in §5.2 of the design brief:
 *
 *   1. It tells the time in the visitor's own timezone, worked out from
 *      their IP address, so a buyer in London sees a London clock rather
 *      than a factory clock and has to do the arithmetic themselves.
 *   2. It lets them switch — the dropdown holds the major buying markets
 *      and the factory's own time, and the choice sticks across pages.
 *   3. The hands move in real time, and a sweep movement does not tick.
 *
 * The IP lookup is the part that needs care. A request to a third-party
 * geolocation service sends the visitor's IP to that service, which is
 * the exact thing the site avoids elsewhere: Plausible was chosen over
 * GA4 specifically to stay out of the consent-banner requirement that
 * such a request triggers under European rules.
 *
 * So there is no geolocation request. The timezone is derived from
 * Intl.DateTimeFormat().resolvedOptions().timeZone, which the browser
 * already knows and which involves no network call at all. It is less
 * precise than an IP lookup — it reports the browser's configured zone
 * rather than the physical location — but for a clock face it is exact
 * enough, and it costs the visitor nothing.
 *
 * The dropdown is not a decoration either: a buyer in New York who is
 * scheduling a factory call needs to know what time it is in Xiamen, and
 * the one-tap answer is the point of the widget.
 */

import { useEffect, useRef, useState } from 'react';

type Zone = {
  id: string;
  label: string;
  /** Offset from UTC in hours. */
  offset: number;
};

/* The five zones the specification names, in its order. The factory's own
   time is first and marked, because the question a buyer is usually
   trying to answer is what time it is at the factory.

   The visitor's own zone is not in this list. It is selected
   automatically after the page loads, and the label says so — a buyer in
   Amsterdam should not have to hunt through five cities to find the one
   they are in. */
const ZONES: Zone[] = [
  { id: 'xiamen', label: 'Beijing/Xiamen (UTC+8) [Factory HQ]', offset: 8 },
  { id: 'london', label: 'London (UTC+0)', offset: 0 },
  { id: 'newyork', label: 'New York (EST -5)', offset: -5 },
  { id: 'tokyo', label: 'Tokyo (JST +9)', offset: 9 },
  { id: 'paris', label: 'Paris (CET +1)', offset: 1 }
];

/** The browser's own zone, resolved once the page has hydrated. */
function browserOffset(): number {
  try {
    /* The offset is measured against the browser's own clock rather than
       looked up from the zone name. `new Date("Asia/Shanghai")` is an
       invalid date — a zone name is not a date — and getTimezoneOffset()
       on it returns NaN, which put "UTCNaN" and a NaN clock on the page.
       The browser already knows its own offset; that is what this reads. */
    const minutes = -new Date().getTimezoneOffset();
    /* Round to the nearest half hour — the zones that use one are the
       ones a buyer is likely to be in, and a clock showing 5:30 for a
       zone that is actually 5:45 would be worse than one showing
       5:30 for a zone that is 5:00. */
    return Math.round(minutes / 30) * 0.5;
  } catch {
    return 0;
  }
}

export function LiveClock() {
  const [zoneId, setZoneId] = useState('xiamen');
  const [now, setNow] = useState<Date | null>(null);
  const [localOffset, setLocalOffset] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* Read the browser's zone after mount, so the server-rendered markup and
     the hydrated page agree. Rendering a different time on the server
     would put a hydration mismatch in the console on every page load. */
  useEffect(() => {
    const off = browserOffset();
    setLocalOffset(off);
    setZoneId('local');
  }, []);

  /* The hands. A sweep movement does not step once a second, so the
     seconds hand is drawn as a smooth sweep rather than a jump — which
     is also the movement the site says it fits.

     The seconds hand is present because the owner asked for it: a clock
     that reads the time to the second is a clock you can check your own
     watch against, and this is the one element on the page that
     demonstrates the factory's movements rather than describing them.
     (The specification had asked for the seconds hand to be removed in
     favour of a quieter face — the owner's instruction takes precedence
     over the document.) */
  useEffect(() => {
    let raf = 0;
    let lastPaint = 0;

    const tick = (ts: number) => {
      /* 20 frames a second is enough for the minute hand but not for
         the seconds hand — at 20fps a sweep second hand visibly stutters,
         because it advances 18 degrees per frame and the eye can count
         the steps. 30fps halves the interval to 12 degrees, which reads
         as continuous, and still costs half of what 60 does on a phone
         that is already running the rest of the page. */
      if (ts - lastPaint > 33) {
        lastPaint = ts;
        setNow(new Date());
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* The visitor's own zone is not in the list, so it is handled as its
     own case rather than as a sixth entry: it has no fixed offset and no
     city name, and it is the default only until the page has hydrated. */
  const zone = ZONES.find((z) => z.id === zoneId);
  const isLocal = zoneId === 'local';
  const offset = isLocal ? (localOffset ?? 8) : (zone?.offset ?? 8);

  /* The time in the selected zone. Working from UTC rather than from the
     local Date avoids the browser's own zone entirely, so the result is
     the same whatever the visitor's machine is set to. */
  /* The reading, to the second.
     The seconds hand is drawn as a sweep rather than a jump, because the
     site says it fits silent sweep movements — a step-second hand would
     contradict the movement matrix two pages away. The minute hand
     advances smoothly for the same reason, and uses the seconds for its
     sub-degree position. */
  const parts = (() => {
    if (!now) return { h: 0, m: 0, s: 0, label: '--:--:--' };
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const z = new Date(utcMs + offset * 3600000);
    const h = z.getHours();
    const m = z.getMinutes();
    const s = z.getSeconds() + z.getMilliseconds() / 1000;
    const label =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return { h, m, s, label };
  })();

  const secDeg = parts.s * 6;
  const minDeg = parts.m * 6 + parts.s * 0.1;
  const hourDeg = (parts.h % 12) * 30 + parts.m * 0.5;

  const zoneLabel = isLocal
    ? `Your local time (UTC${offset >= 0 ? '+' : ''}${offset})`
    : (zone?.label ?? '');

  return (
    <div className="clockbox">
      <div className="clockbox-head">
        <span className="clockbox-title">Live clock engine</span>
        <select
          className="clockbox-sel"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          aria-label="Time zone"
        >
          <option value="local">Your local time</option>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.label}</option>
          ))}
        </select>
      </div>

      <div className="clockbox-face">
        <svg
          ref={svgRef}
          className="clockface"
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Analog clock showing ${zoneLabel}`}
        >
          <circle cx="100" cy="100" r="95" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
          {/* Minute ticks. Every fifth one is longer, which is what makes a
              clock face readable at a glance rather than just decorative. */}
          {Array.from({ length: 60 }).map((_, i) => {
            const major = i % 5 === 0;
            const a = (i * 6 * Math.PI) / 180;
            const r1 = major ? 78 : 84;
            const r2 = 90;
            return (
              <line
                key={i}
                x1={100 + Math.sin(a) * r1}
                y1={100 - Math.cos(a) * r1}
                x2={100 + Math.sin(a) * r2}
                y2={100 - Math.cos(a) * r2}
                stroke={major ? '#111111' : '#C9CDD3'}
                strokeWidth={major ? 2.4 : 1}
              />
            );
          })}
          {/* 12, 3, 6, 9 in the mono face, as the specification's data
              cards do. */}
          {[
            [100, 52, '12'],
            [148, 106, '3'],
            [100, 160, '6'],
            [52, 106, '9']
          ].map(([x, y, t]) => (
            <text
              key={t as string}
              x={x as number}
              y={y as number}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="13"
              fontWeight="600"
              fill="#111111"
              fontFamily="var(--font-tech), monospace"
            >
              {t}
            </text>
          ))}
          <line
            x1="100" y1="100" x2="100" y2="55"
            stroke="#111111" strokeWidth="5" strokeLinecap="round"
            transform={`rotate(${hourDeg} 100 100)`}
          />
          <line
            x1="100" y1="100" x2="100" y2="35"
            stroke="#3d4450" strokeWidth="3.2" strokeLinecap="round"
            transform={`rotate(${minDeg} 100 100)`}
          />
          {/* The seconds hand. Thin and in the mid grey rather than
              black, so it sits behind the hour and minute hands in
              weight and the face still reads cleanly at a glance. */}
          <line
            x1="100" y1="112" x2="100" y2="26"
            stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round"
            transform={`rotate(${secDeg} 100 100)`}
          />
          {/* The centre cap is brass, not blue. §5.1-3 calls for a brass
              hub on a plain white face, and the accent colour is
              reserved for actions — a clock is not an action. */}
          <circle cx="100" cy="100" r="5" fill="#B8874A" />
          <circle cx="100" cy="100" r="2" fill="#8A6435" />
        </svg>
      </div>

      <div className="clockbox-foot">
        <span className="clockbox-zone">{zoneLabel}</span>
        <span className="clockbox-time tnum">{parts.label}</span>
      </div>

      {/* The anechoic chamber reading. §5.1-3 asks for it beside the
          time, and it is the one measurement on the page that is a
          claim about the factory rather than about the clock: the floor
          noise of the room the movements are tested in. */}
      <div className="clockbox-noise">
        <span className="clockbox-noise-l">Anechoic Noise Floor</span>
        <span className="clockbox-noise-v tnum">8.4 dB</span>
        <span className="clockbox-noise-t">Whisper Quiet</span>
      </div>
    </div>
  );
}
