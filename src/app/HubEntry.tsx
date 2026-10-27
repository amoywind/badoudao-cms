'use client';

import * as React from 'react';
import Link from 'next/link';
import { TABS, buildCode, DEFAULT_PICKS } from './CustomizerHub';

/**
 * The home page's customizer entry.
 *
 * The home page states the promise; the customizer page carries the
 * tool. This card is the bridge: a buyer who has not decided yet
 * chooses nothing and presses the button, and a buyer who has a
 * preference picks it here and arrives on the customizer page with
 * that choice already made.
 *
 * Four selects and a code, not the full tabbed tool. The full tool
 * asks for the same four things with a note under each one, and it
 * takes eight hundred pixels of the home page to do it. A buyer
 * scrolling the home page on a phone reaches this card at the tenth
 * screen, so the card has to be worth stopping at.
 *
 * The choices travel in the URL. They are four short codes, so the
 * link is readable, and the customizer page reads them back and opens
 * on the tab the buyer was last looking at.
 */
export function HubEntry() {
  const [picks, setPicks] = React.useState<Record<string, string>>(DEFAULT_PICKS);

  const code = buildCode(picks);
  const qs = TABS.map((t) => `${t.key}=${encodeURIComponent(picks[t.key] || '')}`).join('&');

  return (
    <div className="hub-entry">
      <div className="hub-entry-main">
        <div className="hub-entry-head">
          <span className="hub-entry-h">Your specification</span>
          <span className="hub-entry-code tnum">{code}</span>
        </div>

        <div className="hub-entry-picks">
          {TABS.map((t) => (
            <label className="hub-entry-pick" key={t.key}>
              <span className="hub-entry-k">{t.label}</span>
              <select
                className="inp"
                value={picks[t.key]}
                onChange={(e) => setPicks({ ...picks, [t.key]: e.target.value })}
              >
                {t.choices.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="hub-entry-side">
        <p className="hub-entry-note">
          Four decisions make a clock. Set them here and the specification is
          written down for the factory — no email describing options in prose.
        </p>
        <Link href={`/customizer?${qs}`} className="btn btn-primary hub-entry-btn">
          Open the customizer →
        </Link>
        <p className="hub-entry-fine">
          Or send it straight to the factory.{' '}
          <Link href="/contact" className="hub-entry-link">
            Request a quote
          </Link>
        </p>
      </div>
    </div>
  );
}
