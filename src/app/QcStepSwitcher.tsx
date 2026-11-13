'use client';

import { useEffect, useState } from 'react';

type QcStepData = {
  n: string;
  title: string;
  standard: string;
  desc: string;
  checkpoints: string[];
  videoId: string;
  videoTitle: string;
};

/* Illustrative readouts for the instrument panel. These are NOT recorded
   measurements: they only drift inside the pass band so the panel reads as
   a live instrument. A real figure from a QC report must never be faked —
   if the owner supplies one, it replaces these arrays rather than joining
   them. The initial value is a fixed literal so the server render and the
   first client render agree; the drift starts only inside useEffect. */
const MOISTURE = ['9.8', '10.2', '9.5', '10.6', '9.9', '10.1', '9.6'];
const DECIBEL = ['8.4', '8.9', '8.2', '9.1', '8.6', '9.3', '8.5'];

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.3" />
      <path d="M4.8 8.2l2.1 2.1 4.3-4.4" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* The four instrument scenes. Kept as one switch rather than four
   components: they share the panel's centering, and a new step should be
   one more case here plus one more row in the data, not a new file. */
function Scene({ index, tick }: { index: number; tick: number }) {
  if (index === 0) {
    return (
      <div className="qcsw-scene">
        <div className="qcsw-slab">
          <div className="qcsw-grain" />
          <div className="qcsw-cap" />
          <div className="qcsw-laser" />
          <div className="qcsw-slab-label">BLACK WALNUT SLAB</div>
        </div>
        <div className="qcsw-read">
          <div><span>MOISTURE CONTENT:</span><b>{MOISTURE[tick]}% (PASS: 8-12%)</b></div>
          <div><span>WARP CHECK:</span><b>IN RANGE</b></div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="qcsw-scene">
        <div className="qcsw-rack">24-HOUR AGING RACK #08</div>
        <div className="qcsw-db"><span>{DECIBEL[tick]}</span><small> dB</small></div>
        <div className="qcsw-floor">BACKGROUND ANECHOIC NOISE FLOOR (&lt; 10 dBA)</div>
        <div className="qcsw-bars">
          {Array.from({ length: 21 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i * 0.07).toFixed(2)}s`, animationDuration: `${(0.8 + (i % 5) * 0.13).toFixed(2)}s` }} />
          ))}
        </div>
        <div className="qcsw-track"><i /></div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="qcsw-scene">
        <div className="qcsw-dial">
          <div className="qcsw-ring" /><div className="qcsw-ring2" />
          <div className="qcsw-needle" /><div className="qcsw-hub" />
        </div>
        <div className="qcsw-ttl">HAND CLEARANCE &amp; BALANCE</div>
        <div className="qcsw-sub">
          Vertical clearance between hour, minute and second hands is checked
          on the pneumatic jig so the sweep never catches.
        </div>
        <div className="qcsw-box qcsw-box-blue">TOLERANCE: &ge; 1.5MM CLEARANCE VERIFIED</div>
      </div>
    );
  }

  const faces = ['1 CORNER', '3 EDGES', '6 FACES'];
  return (
    <div className="qcsw-scene">
      <svg className="qcsw-cube" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 3 L43 13.5 L43 34.5 L24 45 L5 34.5 L5 13.5 Z" stroke="#f5b301" strokeWidth="2.2" strokeLinejoin="round" fill="rgba(245,179,1,.07)" />
        <path d="M5 13.5 L24 24 L43 13.5 M24 24 L24 45" stroke="#f5b301" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <div className="qcsw-shock" />
      <div className="qcsw-ttl">1.2-METER ISTA-1A FREE FALL TEST</div>
      <div className="qcsw-sub">Packed carton dropped onto a concrete test slab.</div>
      <div className="qcsw-faces">
        {faces.map((f, i) => (
          <span key={f} className={tick % faces.length === i ? 'hot' : ''}>{f}</span>
        ))}
      </div>
      <div className="qcsw-box qcsw-box-green">PASS: NO LENS CRACK · STILL RUNNING</div>
    </div>
  );
}

export function QcStepSwitcher({ steps }: { steps: QcStepData[] }) {
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(
      () => setTick((t) => (t + 1) % MOISTURE.length),
      900
    );
    return () => window.clearInterval(id);
  }, []);

  /* Leaving a step must stop its iframe. A YouTube player keeps playing
     under a hidden panel otherwise, and the sound follows the buyer down
     the page. */
  function goTo(i: number) {
    setActive(i);
    setPlaying(null);
  }

  const step = steps[active];

  return (
    <div className="qcsw-card">
      <div className="qcsw-grid">
        <div className="qcsw-left">
          <div className="qcsw-panel">
            <div className="qcsw-cam">
              <span className="qcsw-rec" />
              <span>QC PROTOCOL CAMERA // STEP {String(active + 1).padStart(2, '0')}</span>
            </div>
            <div className="qcsw-sweep" />

            {step.videoId ? (
              playing === active ? (
                <iframe
                  className="qcsw-iframe"
                  src={`https://www.youtube-nocookie.com/embed/${step.videoId}?autoplay=1`}
                  title={step.videoTitle}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button className="qcsw-video" onClick={() => setPlaying(active)} aria-label={`Play ${step.videoTitle}`}>
                  <img src={`https://i.ytimg.com/vi/${step.videoId}/hqdefault.jpg`} alt="" loading="lazy" />
                  <span className="qcsw-play" aria-hidden="true">▶</span>
                  <span className="qcsw-video-t">{step.videoTitle}</span>
                </button>
              )
            ) : (
              <Scene index={active} tick={tick} />
            )}
          </div>

          <div className="qcsw-tabs" role="tablist" aria-label="QC inspection stages">
            {steps.map((s, i) => (
              <button
                key={s.n}
                role="tab"
                aria-selected={active === i}
                className={`qcsw-tab${active === i ? ' on' : ''}`}
                onClick={() => goTo(i)}
              >
                {s.n}
              </button>
            ))}
          </div>
        </div>

        <div className="qcsw-right" role="tabpanel">
          <div className="qcsw-stage">INSPECTION STAGE {String(active + 1).padStart(2, '0')} OF {String(steps.length).padStart(2, '0')}</div>
          <h3>{step.title}</h3>
          <p className="qcsw-standard">Standard: {step.standard}</p>
          <div className="qcsw-desc">{step.desc}</div>
          <div className="qcsw-ck-label">MANDATORY CHECKPOINTS &amp; PASS THRESHOLDS:</div>
          {step.checkpoints.map((c) => (
            <div className="qcsw-ck" key={c}><CheckIcon />{c}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
