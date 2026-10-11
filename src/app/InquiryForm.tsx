'use client';

import { useRef, useState } from 'react';

/**
 * Enquiry form.
 *
 * Reduced from nine fields to five required (name, email, WhatsApp,
 * quantity, message) plus three optional (company, country, drawings).
 * Company and country were kept rather than dropped — they are how a buyer
 * is qualified later, and asking for them costs the visitor one optional
 * field. Country became a select because typing a country name is slower
 * than picking one.
 *
 * Drawings are optional and capped at 2 MB client-side; the server
 * re-checks the size because a browser check can be bypassed.
 */

const QUANTITIES = ['500 - 999', '1,000 - 2,999', '3,000 - 9,999', '10,000+', 'Not sure yet'];

/* Buyers come from everywhere, so the dialling code is a separate control
   instead of being guessed from the phone field. */
const DIAL_CODES = [
  ['+1', 'US/CA'], ['+44', 'UK'], ['+49', 'DE'], ['+33', 'FR'], ['+39', 'IT'],
  ['+34', 'ES'], ['+31', 'NL'], ['+32', 'BE'], ['+46', 'SE'], ['+47', 'NO'],
  ['+45', 'DK'], ['+48', 'PL'], ['+81', 'JP'], ['+82', 'KR'], ['+61', 'AU'],
  ['+64', 'NZ'], ['+65', 'SG'], ['+60', 'MY'], ['+66', 'TH'], ['+63', 'PH'],
  ['+62', 'ID'], ['+91', 'IN'], ['+86', 'CN'], ['+852', 'HK'], ['+886', 'TW'],
  ['+971', 'AE'], ['+968', 'OM'], ['+966', 'SA'], ['+90', 'TR'], ['+20', 'EG'],
  ['+27', 'ZA'], ['+55', 'BR'], ['+52', 'MX'], ['+56', 'CL'], ['+54', 'AR'],
  ['+61', 'AU'], ['+64', 'NZ'], ['+92', 'PK'], ['+880', 'BD'], ['+94', 'LK'],
  ['+7', 'RU/KZ'], ['+380', 'UA'], ['+375', 'BY']
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy',
  'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Poland', 'Portugal', 'Greece', 'Ireland', 'Austria', 'Switzerland',
  'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore', 'Malaysia',
  'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'India', 'Pakistan',
  'Bangladesh', 'Sri Lanka', 'Nepal', 'China', 'Hong Kong', 'Taiwan',
  'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Israel', 'Turkey',
  'Egypt', 'Morocco', 'South Africa', 'Nigeria', 'Kenya', 'Brazil', 'Mexico',
  'Chile', 'Argentina', 'Peru', 'Colombia', 'Russia', 'Ukraine', 'Other'
];

const MAX_DRAWING = 2 * 1024 * 1024;
const DRAWING_TYPES = ['image/', 'application/pdf'];

const DEFAULT_MESSAGE =
  'Please describe your wall clock requirements — size, shape, movement, dial design, quantity and target price.';

/** Compact variant for the product page: same fields, less chrome. */
export function InquiryForm({
  products = [],
  preset = '',
  compact = false,
  showDrawing = true
}: {
  products?: { id: string; name: string }[];
  preset?: string;
  compact?: boolean;
  showDrawing?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [t0] = useState(Date.now());
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [dial, setDial] = useState('+86');
  const fileRef = useRef<HTMLInputElement>(null);

  const [picked, setPicked] = useState(preset ? [preset] : []);

  function chooseFile(f: File | null) {
    setFileError('');
    setFile(null);
    if (!f) return;

    if (!DRAWING_TYPES.some((t) => f.type.startsWith(t) || f.type === t)) {
      setFileError('Only images and PDF files are accepted.');
      return;
    }
    if (f.size > MAX_DRAWING) {
      const mb = (f.size / 1024 / 1024).toFixed(1);
      setFileError(`${f.name} is ${mb} MB. The limit is 2 MB — please compress it or share a link instead.`);
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    chooseFile(e.dataTransfer.files?.[0] || null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (fileError) return;

    setBusy(true);
    setStatus('');

    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const whatsapp = `${dial}${String(fd.get('whatsapp') || '').replace(/[^\d]/g, '')}`;

    /* JSON when there is no file, multipart when there is — keeping the
       common path as JSON avoids re-parsing the body server-side. */
    const common = {
      name: fd.get('name'),
      email: fd.get('email'),
      whatsapp,
      company: fd.get('company'),
      country: fd.get('country'),
      quantity: fd.get('quantity'),
      products: picked,
      product_single: picked[0] || '',
      other_product: fd.get('other_product') || '',
      custom_logo: fd.get('custom_logo') || 'no',
      message: fd.get('message'),
      sourcePage: window.location.pathname,
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
      utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || '',
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
      ts: t0,
      website: fd.get('website')
    };

    try {
      let res: Response;
      if (file) {
        const body = new FormData();
        Object.entries(common).forEach(([k, v]) => body.append(k, String(v ?? '')));
        body.append('drawing', file);
        res = await fetch('/api/contact', { method: 'POST', body });
      } else {
        res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(common)
        });
      }

      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(d.error || 'Send failed — please try again.'); return; }

      setStatus('ok');
      (e.currentTarget as HTMLFormElement).reset();
      setPicked([]);
      setFile(null);
      setDial('+86');
    } catch {
      setStatus('Network error. Please retry, or email us directly.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`form-card ${compact ? 'form-compact' : ''}`}>
      <div className={`form-msg ${status ? 'show ' : ''}${status === 'ok' ? 'ok' : 'err'}`}>
        {status === 'ok'
          ? 'Received — we reply within 12 hours.'
          : status}
      </div>

      {preset && (
        <div className="note-box" style={{ marginTop: 0 }}>
          Enquiring about: <strong>{preset}</strong>
        </div>
      )}

      <form onSubmit={submit}>
        {/* ---- required ---- */}
        <div className="fg">
          <label className="fl" htmlFor="if-name">Your name<span className="req">*</span></label>
          <input className="inp" id="if-name" name="name" required placeholder="Mark Smith" />
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-email">Business email<span className="req">*</span></label>
          <input className="inp" id="if-email" name="email" type="email" required
            placeholder="you@company.com" />
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-wa">WhatsApp<span className="req">*</span></label>
          <div className="wa-row">
            <select className="inp wa-code" value={dial} onChange={(e) => setDial(e.target.value)}
              aria-label="Country dialling code">
              {DIAL_CODES.map(([code, label]) => (
                <option key={code} value={code}>{code} {label}</option>
              ))}
            </select>
            <input className="inp wa-num" id="if-wa" name="whatsapp" required
              inputMode="tel" placeholder="13800138000" pattern="[0-9]{6,15}"
              title="Digits only, 6 to 15 numbers" />
          </div>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-qty">Estimated quantity<span className="req">*</span></label>
          <select className="inp" id="if-qty" name="quantity" required defaultValue="">
            <option value="">Select a range…</option>
            {QUANTITIES.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-msg">Your requirements<span className="req">*</span></label>
          <textarea className="inp" id="if-msg" name="message" required rows={4}
            placeholder={DEFAULT_MESSAGE} />
        </div>

        {/* ---- optional ---- */}
        <div className="fg">
          <div className="opt-div"><span>Optional</span></div>

          <div className="fg2">
            <div>
              <label className="fl" htmlFor="if-company">Company</label>
              <input className="inp" id="if-company" name="company" placeholder="Company Ltd" />
            </div>
            <div>
              <label className="fl" htmlFor="if-country">Country</label>
              <select className="inp" id="if-country" name="country" defaultValue="">
                <option value="">Select…</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <div className="fg">
            <label className="fl" htmlFor="if-product">Model of interest</label>
            <select className="inp" id="if-product"
              value={picked[0] || ''}
              onChange={(e) => setPicked(e.target.value ? [e.target.value] : [])}>
              <option value="">Select a model…</option>
              {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="fg">
          <label className="fl" htmlFor="if-other">Other specification</label>
          <input className="inp" id="if-other" name="other_product"
            placeholder="e.g. 20-inch metal wall clock with custom dial" />
        </div>

        {showDrawing && (
          <div className="fg">
            <label className="fl">Drawings or reference images
              <span className="hint">optional · max 2 MB</span>
            </label>

            <div className={`drop${file ? ' has-file' : ''}${fileError ? ' has-error' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => !file && fileRef.current?.click()}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}>

              {file ? (
                <>
                  <div className="file-chip">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="file-x"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    aria-label="Remove file">×</button>
                </>
              ) : (
                <span className="drop-txt">Drop a file here or click to browse</span>
              )}
            </div>

            <input ref={fileRef} type="file" hidden
              accept="image/*,application/pdf"
              onChange={(e) => chooseFile(e.target.files?.[0] || null)} />

            {fileError && <div className="fg-err">{fileError}</div>}
          </div>
        )}

        <input type="text" name="website" tabIndex={-1} autoComplete="off"
          className="hp" aria-hidden="true" />

        <button className="btn btn-primary" type="submit" disabled={busy}
          style={{ width: '100%' }}>
          {busy ? 'Sending…' : 'Send enquiry'}
        </button>

        <p className="req-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#0f5c4a" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg>
          We reply within 12 hours. Your details are used only to answer this enquiry.
        </p>
      </form>
    </div>
  );
}

/**
 * Teaser shown in place of the full form on pages where a form would be an
 * interruption. It carries the product name into the contact page so the
 * buyer does not retype it.
 */
export function InquiryCTA({ preset = '', label = 'Request a quotation' }: { preset?: string; label?: string }) {
  const href = preset ? `/contact/?model=${encodeURIComponent(preset)}` : '/contact/';
  return (
    <div className="inq-cta">
      <div>
        <h3>{label}</h3>
        {preset && <p className="inq-cta-sub">For <strong>{preset}</strong></p>}
      </div>
      <a className="btn btn-primary" href={href}>Send an enquiry →</a>
    </div>
  );
}