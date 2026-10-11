'use client';

import { useRef, useState } from 'react';

/**
 * Enquiry form.
 *
 * Five required fields and one optional attachment. Company, country and
 * the model picker were removed at the owner's request — the buyer
 * already knows what they want, and every extra field costs completions.
 * The model is captured server-side from the page the form sits on, so a
 * product enquiry is still attributed to the right product without asking.
 *
 * The WhatsApp field accepts the formatting people actually type: spaces,
 * dashes, parentheses and a leading + all pass through and are stripped on
 * submit. An earlier version used an HTML `pattern` of [0-9]{6,15}, which
 * the browser enforced silently — a buyer typing "+1 555 123 4567" was
 * blocked with no visible reason and no way forward.
 */

const QUANTITIES = ['500 - 999', '1,000 - 2,999', '3,000 - 9,999', '10,000+', 'Not sure yet'];

const DIAL_CODES = [
  ['+1', 'US/CA'], ['+44', 'UK'], ['+49', 'DE'], ['+33', 'FR'], ['+39', 'IT'],
  ['+34', 'ES'], ['+31', 'NL'], ['+32', 'BE'], ['+46', 'SE'], ['+47', 'NO'],
  ['+45', 'DK'], ['+48', 'PL'], ['+81', 'JP'], ['+82', 'KR'], ['+61', 'AU'],
  ['+64', 'NZ'], ['+65', 'SG'], ['+60', 'MY'], ['+66', 'TH'], ['+63', 'PH'],
  ['+62', 'ID'], ['+91', 'IN'], ['+86', 'CN'], ['+852', 'HK'], ['+886', 'TW'],
  ['+971', 'AE'], ['+968', 'OM'], ['+966', 'SA'], ['+90', 'TR'], ['+20', 'EG'],
  ['+27', 'ZA'], ['+55', 'BR'], ['+52', 'MX'], ['+56', 'CL'], ['+54', 'AR'],
  ['+92', 'PK'], ['+880', 'BD'], ['+94', 'LK'], ['+7', 'RU/KZ'], ['+380', 'UA'],
  ['+375', 'BY']
];

const MAX_DRAWING = 2 * 1024 * 1024;
const DRAWING_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const DEFAULT_MESSAGE =
  'Please describe your wall clock requirements — size, shape, movement, dial design, quantity and target price.';

/** Keep digits only, so "+1 (555) 123-4567" becomes "15551234567". */
function digitsOnly(s: string) {
  return String(s ?? '').replace(/\D/g, '');
}

export function InquiryForm({
  preset = '',
  compact = false
}: {
  preset?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [t0] = useState(Date.now());
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [dial, setDial] = useState('+86');
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseFile(f: File | null) {
    setFileError('');
    setFile(null);
    if (!f) return;

    const looksImage = f.type.startsWith('image/');
    const looksPdf = f.type === 'application/pdf';
    if (!looksImage && !looksPdf) {
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
    if (busy || fileError) return;

    setBusy(true);
    setStatus('');

    /* Hold the form element in a local. React clears event.currentTarget
       as soon as the handler yields at an await, and the previous version
       called form.reset() after the fetch — which threw, was swallowed by
       the catch below, and reported "network error" for an enquiry that had
       in fact been saved. The buyer then resubmitted, leaving duplicates. */
    const form = formRef.current;
    const fd = new FormData(form as HTMLFormElement);

    const whatsapp = dial + digitsOnly(String(fd.get('whatsapp') || ''));

    const payload = {
      name: fd.get('name'),
      email: fd.get('email'),
      whatsapp,
      quantity: fd.get('quantity'),
      message: fd.get('message'),
      /* The model comes from the page, not from a picker the buyer has to
         use — a product enquiry is still attributed to that product. */
      products: preset ? [preset] : [],
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
        Object.entries(payload).forEach(([k, v]) => body.append(k, String(v ?? '')));
        body.append('drawing', file);
        res = await fetch('/api/contact', { method: 'POST', body });
      } else {
        res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const d = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(d.error || 'Send failed — please try again.');
        return;
      }

      form?.reset();
      setFile(null);
      setDial('+86');
      setStatus(
        d.warning
          ? 'Received — but the file did not upload. Please email it to us separately.'
          : 'ok'
      );
    } catch {
      setStatus('Network error. Please retry, or email us directly.');
    } finally {
      setBusy(false);
    }
  }

  const failed = status && status !== 'ok' && !status.startsWith('Received');

  return (
    <div className={`form-card ${compact ? 'form-compact' : ''}`}>
      <div className={`form-msg ${status ? 'show ' : ''}${status === 'ok' || status.startsWith('Received') ? 'ok' : 'err'}`}>
        {status === 'ok' ? 'Received — we reply within 12 hours.' : status}
      </div>

      {preset && (
        <div className="note-box" style={{ marginTop: 0 }}>
          Enquiring about: <strong>{preset}</strong>
        </div>
      )}

      <form onSubmit={submit} ref={formRef} noValidate={false}>
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
            <select className="inp wa-code" value={dial}
              onChange={(e) => setDial(e.target.value)} aria-label="Country dialling code">
              {DIAL_CODES.map(([code, label]) => (
                <option key={code} value={code}>{code} {label}</option>
              ))}
            </select>
            <input className="inp wa-num" id="if-wa" name="whatsapp" required
              inputMode="tel" placeholder="13800138000"
              title="Include your area code if not listed" />
          </div>
          <div className="help">Spaces and dashes are fine</div>
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
          <textarea className="inp" id="if-msg" name="message" required rows={5}
            placeholder={DEFAULT_MESSAGE} />
        </div>

        <div className="fg">
          <label className="fl">
            Drawings or reference images
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

          <input ref={fileRef} type="file" hidden accept="image/*,application/pdf"
            onChange={(e) => chooseFile(e.target.files?.[0] || null)} />

          {fileError && <div className="fg-err">{fileError}</div>}
        </div>

        <input type="text" name="website" tabIndex={-1} autoComplete="off"
          className="hp" aria-hidden="true" />

        <button className="btn btn-primary" type="submit" disabled={busy}
          style={{ width: '100%' }}>
          {busy ? 'Sending…' : 'Send enquiry'}
        </button>

        {failed && (
          <div className="form-fallback">
            Having trouble? Email <a href="mailto:sales@badoudao.com">sales@badoudao.com</a> instead.
          </div>
        )}

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