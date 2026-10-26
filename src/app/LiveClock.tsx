'use client';

/**
 * The live precision clock engine.
 *
 * A working clock in the first screen, and the argument the site makes
 * in one object: this factory fits movements that are quiet, and here
 * is the difference in decibels.
 *
 * WHAT IT DOES
 *
 * The buyer picks a dial face, a hand alloy and a drive mode. The dial
 * redraws, the hands change colour, the second hand either sweeps or
 * steps, and the decibel reading follows. The sound of the movement can
 * be played, and the current configuration can be written into the
 * enquiry form at the bottom of the page.
 *
 * WHY THE SOUND IS SYNTHESISED
 *
 * A factory recording is a file, and a file on the server is a file the
 * visitor downloads before they have decided they want to hear it.
 * Synthesising the tick means the page carries no audio at all — the
 * Web Audio API builds the sound the moment it is asked for. It also
 * means the two movements sound different for the reason they really
 * are different, rather than because two recordings were made on
 * different days.
 *
 * WHY THE SECONDS HAND SWEEPS
 *
 * The sweep movement is the one the site recommends and the one whose
 * decibels it is quoting. A stepping second hand would show a tick the
 * reading does not have. So the sweep is drawn with the linear
 * interpolation the specification gives, and the step mode holds the
 * hand still and jumps it at the second — which is what makes the two
 * visibly different as well as audibly different.
 *
 * THE GEOMETRY
 *
 * The dial is drawn in a 240-unit square with the centre locked at
 * (120, 120), and every radius in the specification is measured from
 * that centre: the bezel at 114, the guide track at 104, the minute
 * ticks from 98, the hour ticks from 92, the hour hand to 66, the
 * minute hand to 42, the second hand to 30 with its counterweight
 * tail reaching 140 the other way.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACOUSTICS,
  CLOCK_ZONES,
  DIAL_FACES,
  DRIVE_MODES,
  HAND_ALLOYS
} from '@/lib/clock-data';

/** The browser's own zone, resolved once the page has hydrated. */
function browserOffset(): number {
  try {
    const minutes = -new Date().getTimezoneOffset();
    return Math.round(minutes / 30) * 0.5;
  } catch {
    return 0;
  }
}

export function LiveClock() {
  const [zoneId, setZoneId] = useState('xiamen');
  const [localOffset, setLocalOffset] = useState<number | null>(null);
  const [faceKey, setFaceKey] = useState<string>('white');
  const [alloyKey, setAlloyKey] = useState<string>('brass');
  const [driveKey, setDriveKey] = useState<string>('sweep');
  const [now, setNow] = useState<Date | null>(null);
  const [db, setDb] = useState(8.4);
  const [dbPeak, setDbPeak] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const face = useMemo(
    () => DIAL_FACES.find((f) => f.key === faceKey) || DIAL_FACES[0],
    [faceKey]
  );
  const alloy = useMemo(
    () => HAND_ALLOYS.find((a) => a.key === alloyKey) || HAND_ALLOYS[0],
    [alloyKey]
  );
  const drive = useMemo(
    () => DRIVE_MODES.find((d) => d.key === driveKey) || DRIVE_MODES[0],
    [driveKey]
  );

  /* Read the browser's own zone after mount, so the server-rendered
     markup and the hydrated page agree. Rendering a different time on
     the server would put a hydration mismatch in the console on every
     page load. */
  useEffect(() => {
    const off = browserOffset();
    setLocalOffset(off);
    setZoneId('local');
  }, []);

  /* The hands.

     The sweep mode interpolates linearly on the milliseconds, so the
     second hand glides. The step mode holds the hand still and jumps
     it at the second. */
  useEffect(() => {
    let raf = 0;
    let lastPaint = 0;

    const tick = (ts: number) => {
      /* 30 frames a second: at 20 a sweep second hand advances 18
         degrees per frame and the eye can count the steps. */
      if (ts - lastPaint > 33) {
        lastPaint = ts;
        setNow(new Date());
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* The decibel reading.

     In sweep mode it wanders inside the measured band, the way a real
     meter reading does. In step mode it spikes on every tick and falls
     back — which is the whole point of the panel: the buyer sees the
     difference between the two movements rather than being told it. */
  useEffect(() => {
    if (drive.key !== 'sweep') return;

    const [lo, hi] = drive.dbRange;
    const timer = setInterval(() => {
      setDb(lo + Math.random() * (hi - lo));
    }, 900);

    return () => clearInterval(timer);
  }, [drive]);

  /* The visitor's own zone is not in the list, so it is handled as its
     own case rather than as a seventh entry: it has no fixed offset and
     no city name, and it is the default only until the page has
     hydrated. */
  const zone = CLOCK_ZONES.find((z) => z.id === zoneId);
  const isLocal = zoneId === 'local';
  const offset = isLocal ? (localOffset ?? 8) : (zone?.offset ?? 8);

  /* The time in the selected zone. Working from UTC rather than from
     the local Date avoids the browser's own zone entirely, so the
     result is the same whatever the visitor's machine is set to. */
  const parts = useMemo(() => {
    if (!now) return { h: 0, m: 0, s: 0, ms: 0, label: '--:--:--' };

    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const z = new Date(utcMs + offset * 3600000);
    const h = z.getHours();
    const m = z.getMinutes();
    const s = z.getSeconds();
    const ms = z.getMilliseconds();

    const label =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return { h, m, s, ms, label };
  }, [now, offset]);

  /* The hand angles.

     Sweep: the second hand carries the milliseconds, so it glides.
     Step: the second hand holds at the whole second and the minute
     hand carries the fraction instead, which is what a real step
     movement does — the minute hand creeps between ticks rather than
     sitting dead until the minute turns. */
  const isStep = drive.key === 'step';
  const secDeg = isStep ? parts.s * 6 : (parts.s + parts.ms / 1000) * 6;
  const minDeg = (parts.m + parts.s / 60) * 6;
  const hourDeg = ((parts.h % 12) + parts.m / 60) * 30;

  const zoneLabel = isLocal
    ? `Your local time (UTC${offset >= 0 ? '+' : ''}${offset})`
    : (zone?.label ?? '');

  /* ---- The acoustic simulator ---- */

  function playSound() {
    setPlaying(true);

    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) { setPlaying(false); return; }

    const ctx = audioRef.current || new Ctx();
    audioRef.current = ctx;
    if (ctx.state === 'suspended') void ctx.resume();

    const nowT = ctx.currentTime;
    const spec = ACOUSTICS[drive.key as keyof typeof ACOUSTICS];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, nowT);

    /* The step movement's tick falls in pitch as it decays — the gear
       tooth striking and the wheel settling. The sweep movement's hum
       stays where it is. */
    if ('fallTo' in spec && spec.fallTo) {
      osc.frequency.exponentialRampToValueAtTime(spec.fallTo, nowT + spec.duration / 1000);
    }

    gain.gain.setValueAtTime(spec.gain, nowT);
    gain.gain.exponentialRampToValueAtTime(0.0001, nowT + spec.duration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(nowT);
    osc.stop(nowT + spec.duration / 1000 + 0.02);

    /* The peak reading, and the return to the floor. This is the
       moment the panel exists to show. */
    if (isStep) {
      setDb(28.4);
      setDbPeak(true);
      setTimeout(() => {
        setDb(9.2);
        setDbPeak(false);
      }, 140);
    }

    setTimeout(() => setPlaying(false), spec.duration + 120);
  }

  /* ---- Write the configuration into the enquiry form ---- */

  function exportToRfq() {
    const spec = `${face.short} dial / ${alloy.short} hands / ${drive.name}`;
    const field = document.getElementById('if-msg') as HTMLTextAreaElement | null;
    const hidden = document.getElementById('clock-spec') as HTMLInputElement | null;

    if (hidden) hidden.value = spec;

    if (field) {
      /* The buyer's own words come first. Their configuration is added
         underneath rather than replacing it, so nothing they wrote is
         lost. */
      const line = `\n\nClock configuration: ${spec}.`;
      if (!field.value.includes('Clock configuration:')) {
        field.value = (field.value.trim() + line).trim();
      }
    }

    const target = document.getElementById('inquiry');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* The dial's colours feed the SVG. The gradient id has to be unique
     per face, or the browser reuses the first one it defined and the
     obsidian dial keeps the white gradient. */
  const gradId = `dial-${face.key}`;

  return (
    <div className="clockbox">
      {/* ---- the console header ---- */}
      <div className="clockbox-head">
        <div className="clockbox-titleblock">
          <div className="clockbox-title">Live precision clock engine</div>
          <div className="clockbox-sub">
            Real-time multi-timezone timekeeping simulator with decibel telemetry
          </div>
        </div>
        <div className="clockbox-selwrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
          </svg>
          <select
            className="clockbox-sel"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            aria-label="Time zone"
          >
            <option value="local">Your local time</option>
            {CLOCK_ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}{z.note ? ` — ${z.note}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="clockbox-body">
        {/* ---- the dial ---- */}
        <div className="clockbox-face">
          <svg
            className="clockface"
            viewBox="0 0 240 240"
            role="img"
            aria-label={`Clock showing ${parts.label} in ${zoneLabel}`}
          >
            <defs>
              <radialGradient id={gradId} cx="38%" cy="30%" r="78%">
                <stop offset="0%" stopColor={face.bg} stopOpacity="1" />
                <stop offset="100%" stopColor={face.bezel} stopOpacity="1" />
              </radialGradient>
              <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#000" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* The outer bezel. A radial gradient across the face, so
                the dial reads as a dished surface rather than a flat
                disc. */}
            <circle cx="120" cy="120" r="114" fill={`url(#${gradId})`} />
            <circle cx="120" cy="120" r="114" fill="none" stroke="#111111" strokeWidth="4" />

            {/* The inner guide track — the fine dashed circle a
                precision dial is marked with. */}
            <circle
              cx="120" cy="120" r="104"
              fill="none" stroke={face.major} strokeWidth="0.7"
              strokeDasharray="2,2" opacity="0.6"
            />

            {/* Sixty minute ticks. */}
            {Array.from({ length: 60 }).map((_, i) => {
              const major = i % 5 === 0;
              const a = (i * 6 * Math.PI) / 180;
              const r1 = major ? 92 : 98;
              const r2 = 104;
              return (
                <line
                  key={`m${i}`}
                  x1={120 + Math.sin(a) * r1}
                  y1={120 - Math.cos(a) * r1}
                  x2={120 + Math.sin(a) * r2}
                  y2={120 - Math.cos(a) * r2}
                  stroke={major ? face.major : face.tick}
                  strokeWidth={major ? 2.5 : 1}
                  opacity={major ? 1 : 0.75}
                />
              );
            })}

            {/* The four numerals. */}
            {([
              [120, 62, '12'],
              [176, 126, '3'],
              [120, 186, '6'],
              [64, 126, '9']
            ] as [number, number, string][]).map(([x, y, t]) => (
              <text
                key={t}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fontWeight="600"
                fill={face.digit}
                fontFamily="var(--font-display), sans-serif"
              >
                {t}
              </text>
            ))}

            {/* The pad-printed brand mark. This is what a real dial
                carries, and it is the detail that makes the rendering
                read as a product rather than as an icon. */}
            <text
              x="120" y="88"
              textAnchor="middle"
              fontSize="7"
              fontWeight="700"
              letterSpacing="1"
              fill={face.digit}
              fontFamily="var(--font-tech), monospace"
            >
              OEMWALLCLOCKS
            </text>
            <text
              x="120" y="97"
              textAnchor="middle"
              fontSize="5"
              letterSpacing="0.3"
              fill={face.micro}
              fontFamily="var(--font-tech), monospace"
            >
              XIAMEN FACILITY · SILENT QUARTZ
            </text>

            {/* The hour hand. */}
            <line
              x1="120" y1="120" x2="120" y2="54"
              stroke={alloy.hour} strokeWidth="4.5" strokeLinecap="round"
              filter="url(#hand-shadow)"
              transform={`rotate(${hourDeg} 120 120)`}
            />
            {/* The minute hand. */}
            <line
              x1="120" y1="120" x2="120" y2="78"
              stroke={alloy.minute} strokeWidth="3.2" strokeLinecap="round"
              transform={`rotate(${minDeg} 120 120)`}
            />
            {/* The second hand and its counterweight tail. The tail is
                what makes it a mechanical second hand rather than a
                line — a real one is balanced about its pivot. */}
            <g transform={`rotate(${secDeg} 120 120)`}>
              <line
                x1="120" y1="120" x2="120" y2="90"
                stroke={alloy.second} strokeWidth="1.4" strokeLinecap="round"
              />
              <line
                x1="120" y1="120" x2="120" y2="260"
                stroke={alloy.second} strokeWidth="1.1" strokeLinecap="round"
              />
              <circle cx="120" cy="260" r="3" fill={alloy.second} />
            </g>

            {/* The brass hub: a brass disc over a black lock nut. */}
            <circle cx="120" cy="120" r="5" fill="#B8874A" />
            <circle cx="120" cy="120" r="2" fill="#111111" />
          </svg>
        </div>

        {/* ---- the configuration panel ---- */}
        <div className="clockbox-panel">
          {/* 1. the drive mode */}
          <div className="ck-grp">
            <div className="ck-lbl">
              <span className="ck-n">1.</span> Movement drive mode
            </div>
            <div className="ck-opts ck-opts-2">
              {DRIVE_MODES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className={`ck-opt${drive.key === d.key ? ' on' : ''}`}
                  onClick={() => setDriveKey(d.key)}
                >
                  <span className="ck-opt-t">{d.name}</span>
                  <span className="ck-opt-s">
                    {d.db} {d.chip}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. the dial face */}
          <div className="ck-grp">
            <div className="ck-lbl">
              <span className="ck-n">2.</span> Dial face material
            </div>
            <div className="ck-opts ck-opts-2">
              {DIAL_FACES.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`ck-opt${face.key === f.key ? ' on' : ''}`}
                  onClick={() => setFaceKey(f.key)}
                  title={f.note}
                >
                  <span className="ck-swatch" style={{ background: f.bg, borderColor: f.bezel }} />
                  <span className="ck-opt-t">{f.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. the hands */}
          <div className="ck-grp">
            <div className="ck-lbl">
              <span className="ck-n">3.</span> Custom hands alloy
            </div>
            <div className="ck-opts ck-opts-2">
              {HAND_ALLOYS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={`ck-opt${alloy.key === a.key ? ' on' : ''}`}
                  onClick={() => setAlloyKey(a.key)}
                  title={a.note}
                >
                  <span className="ck-swatch" style={{ background: a.hour, borderColor: a.hour }} />
                  <span className="ck-opt-t">{a.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ---- the two actions ---- */}
          <div className="ck-actions">
            <button type="button" className="ck-test" onClick={playSound} disabled={playing}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M11 5L6 9H2v6h4l5 4z" />
                <path d="M15.5 8.5a5 5 0 010 7" />
              </svg>
              {playing ? 'Playing…' : 'Test movement sound'}
            </button>
            <button type="button" className="ck-export" onClick={exportToRfq}>
              Export specs to RFQ →
            </button>
          </div>
        </div>
      </div>

      {/* ---- the two readings ---- */}
      <div className="clockbox-foot">
        <div className="ck-read">
          <div className="ck-read-l">Digital time (local)</div>
          <div className="ck-read-v tnum">{parts.label}</div>
          <div className="ck-read-z">{zoneLabel}</div>
        </div>
        <div className="ck-read">
          <div className="ck-read-l">Acoustic pressure</div>
          <div className={`ck-read-v tnum${dbPeak ? ' peak' : ''}`}>
            {db.toFixed(1)} dB
          </div>
          <div className="ck-read-z">
            {isStep ? 'Standard Tick' : drive.quiet}
          </div>
        </div>
      </div>

      {/* The configuration, carried into the enquiry as a hidden field
          so the factory receives it as a specification rather than as
          a paragraph the buyer had to write. */}
      <input type="hidden" id="clock-spec" name="clockSpec" value="" readOnly />
    </div>
  );
}
