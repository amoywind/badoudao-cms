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

const QUANTITIES = ['300 - 499', '500 - 999', '1,000 - 2,999', '3,000 - 9,999', '10,000+', 'Not sure yet'];

/* The specification dropdowns.
 *
 * Every one of these is optional, and that is deliberate. The form used
 * to carry five required fields and nothing else — the company, country
 * and model pickers were removed at the owner's request, because the
 * buyer already knows what they want and each extra field costs
 * completions.
 *
 * The redesign asks for a fuller form, and it is right to ask: a buyer
 * who picks a movement and a packaging tier here gets a quote that
 * already matches what they need, and one who leaves them blank has said
 * no more than they said before. Optional fields add information without
 * adding friction, which is the difference between a form that helps and
 * one that blocks.
 *
 * On a product page the inquiry builder fills these in for the buyer, so
 * the common case is a pre-filled form. */
const MATERIALS = [
  'Plastic', 'Solid wood', 'Metal', 'Acrylic', 'Glass / crystal', 'Resin', 'Not sure yet'
];
const MOVEMENTS = [
  'Silent sweep quartz', 'Step-second quartz', 'Radio-controlled', 'Chime',
  'Mechanical', 'LCD calendar display', 'LED digital display', 'Not sure yet'
];
const HAND_MATERIALS = [
  'Aluminium', 'Brass', 'Solid wood', 'Acrylic', 'Custom Pantone plastic', 'Not sure yet'
];
const PACKAGING = [
  'Mail-order kraft box', 'Colour gift box', 'Acrylic display box',
  'Custom foam insert', 'Not sure yet'
];
const TIMELINES = [
  'Within 2 months', '2-4 months', '4-6 months', 'Just exploring', 'Not sure yet'
];

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

/* The design file types the factory actually receives. A buyer sends a
   vector logo, a CAD drawing or a photograph of a dial — not a PDF
   brochure. The accept list covers those, plus the archives buyers send
   when they have bundled several files together.

   The 2 MB cap is not the specification's 50 MB. It is what a single D1
   row can hold: the file is stored as base64, so 50 MB becomes 67 MB of
   text, and the database is the only place it can go while R2 is not
   bound. Raising the cap needs object storage first. */
const ACCEPT = '.ai,.pdf,.png,.jpg,.jpeg,.webp,.gif,.cad,.dxf,.eps,.svg,.zip,.step,.stp';
const EXT_ALLOW = [
  'ai', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif',
  'cad', 'dxf', 'eps', 'svg', 'zip', 'step', 'stp'
];

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

    /* The extension is checked rather than the MIME type. A browser
       reports an .ai or .cad file as application/octet-stream or
       something equally unhelpful, and the previous check — image or PDF
       only — rejected exactly the files a factory needs. */
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!EXT_ALLOW.includes(ext)) {
      setFileError(
        `${ext ? `.${ext}` : 'That file type'} is not accepted. Use AI, PDF, PNG, JPG, CAD, DXF, EPS, SVG or ZIP.`
      );
      return;
    }
    if (f.size > MAX_DRAWING) {
      const mb = (f.size / 1024 / 1024).toFixed(1);
      setFileError(
        `${f.name} is ${mb} MB. The limit is 2 MB here — email it to amoywind@gmail.com and we will match it to your enquiry.`
      );
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
      company: fd.get('company') || '',
      material: fd.get('material') || '',
      movement: fd.get('movement') || '',
      hands: fd.get('hands') || '',
      packaging: fd.get('packaging') || '',
      timeline: fd.get('timeline') || '',
      /* The specification string from the inquiry builder, when the
         enquiry was started from a product page. Empty everywhere else,
         and the API ignores it when it is. */
      spec: fd.get('spec') || '',
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
          <input className="inp" id="if-name" name="name" required placeholder="Mark Smith"
            autoComplete="name" />
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-email">Business email<span className="req">*</span></label>
          <input className="inp" id="if-email" name="email" type="email" required
            placeholder="you@company.com"
            autoComplete="email"
            /* A business buyer fills this in on a phone and a laptop in
               the same sitting. "email" is a contact field to Chrome, so
               the address they typed here is offered again on the next
               form on the same site. */
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false} />
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-co">Company / brand name
            <span className="hint">optional</span>
          </label>
          <input className="inp" id="if-co" name="company" placeholder="Smith Home Decor LLC"
            autoComplete="organization" />
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
              /* tel rather than "tel-national": the number is stored with the
                 dialling code chosen in the select beside it, so the field
                 holds a national number and must not carry the country
                 prefix twice. */
              autoComplete="tel-national"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
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

        {/* The specification dropdowns. Optional, and on a product page
            the inquiry builder has already filled the equivalent fields
            in — these let a buyer starting from scratch say the same
            thing in one click each. */}
        <div className="fg">
          <div className="spec-h" style={{ marginBottom: 12 }}>Product specification · optional</div>

          <div className="fg2" style={{ marginBottom: 14 }}>
            <div>
              <label className="fl" htmlFor="if-mat" style={{ fontSize: 12 }}>Main material</label>
              <select className="inp" id="if-mat" name="material" defaultValue="">
                <option value="">Select…</option>
                {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="fl" htmlFor="if-mov" style={{ fontSize: 12 }}>Preferred movement</label>
              <select className="inp" id="if-mov" name="movement" defaultValue="">
                <option value="">Select…</option>
                {MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="fg2" style={{ marginBottom: 14 }}>
            <div>
              <label className="fl" htmlFor="if-hnd" style={{ fontSize: 12 }}>Hands material</label>
              <select className="inp" id="if-hnd" name="hands" defaultValue="">
                <option value="">Select…</option>
                {HAND_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="fl" htmlFor="if-pkg" style={{ fontSize: 12 }}>Packaging</label>
              <select className="inp" id="if-pkg" name="packaging" defaultValue="">
                <option value="">Select…</option>
                {PACKAGING.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="fl" htmlFor="if-tml" style={{ fontSize: 12 }}>Target delivery time</label>
            <select className="inp" id="if-tml" name="timeline" defaultValue="">
              <option value="">Select…</option>
              {TIMELINES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-msg">Your requirements<span className="req">*</span></label>
          <textarea className="inp" id="if-msg" name="message" required rows={5}
            placeholder={DEFAULT_MESSAGE}
            /* Deliberately not autofilled. The placeholder is a
               pre-written requirements paragraph, and letting a browser
               replace it would make the buyer edit someone else's words
               before they had decided what they needed. */ />
        </div>

        <div className="fg">
          <label className="fl">
            Drawings or reference images
            <span className="hint">optional · max 2 MB</span>
          </label>

          {/* Uploading is the primary route and the file lands in the admin
              next to the enquiry. The email below is a genuine alternative
              for the cases where it cannot work — a drawing too large to
              compress, or someone on a phone who would rather not grant a
              file picker. Both paths are offered because the ones that
              never arrive are the quotes that needed the drawing. */}
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
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#0052CC" strokeWidth="1.8" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
                  <path d="M7 9l5-5 5 5" strokeLinecap="round" />
                  <path d="M12 4v12" strokeLinecap="round" />
                </svg>
                <span className="drop-txt">Drop your design here, or click to choose a file</span>
              </>
            )}
          </div>

          <input ref={fileRef} type="file" hidden accept={ACCEPT}
            onChange={(e) => chooseFile(e.target.files?.[0] || null)} />

          <div className="drop-alt">
            Or if it is easier — email your design to{' '}
            <a href="mailto:amoywind@gmail.com">amoywind@gmail.com</a>
            {' '}and we will match it to your enquiry.
          </div>

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
            stroke="#0052CC" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg>
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