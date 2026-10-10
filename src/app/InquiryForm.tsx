'use client';

import { useState } from 'react';

export function InquiryForm({ products = [], preset = '' }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [t0] = useState(Date.now());
  const [picked, setPicked] = useState(preset ? [preset] : []);
  const [logo, setLogo] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(true);
    setStatus('');

    const payload = {
      email: fd.get('email'),
      name: fd.get('name'),
      company: fd.get('company'),
      country: fd.get('country'),
      quantity: fd.get('quantity'),
      product_single: fd.get('product_single') || '',
      other_product: fd.get('other_product') || '',
      products: picked,
      custom_logo: logo ? 'yes' : 'no',
      message: fd.get('message'),
      sourcePage: window.location.pathname,
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
      utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || '',
      ts: t0,
      website: fd.get('website')
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (!res.ok) { setStatus(d.error || '发送失败'); return; }
      setStatus('ok');
      e.target.reset();
      setPicked([]);
      setLogo(false);
    } catch {
      setStatus('网络错误，请重试或直接发邮件到 sales@badoudao.com');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-card">
      <div className={`form-msg ${status ? 'show ' : ''}${status === 'ok' ? 'ok' : 'err'}`}>
        {status === 'ok'
          ? '已收到，我们会在 12 小时内回复。'
          : status}
      </div>

      {preset && (
        <div className="note-box" style={{ marginTop: 0 }}>正在询价：<strong>{preset}</strong></div>
      )}

      <form onSubmit={submit}>
        <div className="fg">
          <label className="fl" htmlFor="if-email">Business email<span className="req">*</span></label>
          <input className="inp" id="if-email" name="email" type="email" required placeholder="you@company.com" />
        </div>

        <div className="fg2">
          <div className="fg">
            <label className="fl" htmlFor="if-name">Your name</label>
            <input className="inp" id="if-name" name="name" placeholder="Mark Smith" />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="if-company">Company</label>
            <input className="inp" id="if-company" name="company" placeholder="Company Ltd" />
          </div>
        </div>

        <div className="fg2">
          <div className="fg">
            <label className="fl" htmlFor="if-country">Country</label>
            <input className="inp" id="if-country" name="country" placeholder="Netherlands" />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="if-qty">Estimated quantity<span className="req">*</span></label>
            <select className="inp" id="if-qty" name="quantity" required defaultValue="">
              <option value="">Select…</option>
              <option>500 - 999</option><option>1,000 - 2,999</option>
              <option>3,000 - 9,999</option><option>10,000+</option>
              <option>Not sure yet</option>
            </select>
          </div>
        </div>

        {products.length > 0 && (
          <>
            <div className="fg">
              <label className="fl" htmlFor="if-product">Product of interest</label>
              <select className="inp" id="if-product" name="product_single"
                value={picked[0] || ''} onChange={(e) => setPicked(e.target.value ? [e.target.value] : [])}>
                <option value="">Select a model…</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Also interested in<span className="hint">optional</span></label>
              <div className="chk-row">
                {products.slice(0, 8).map((p) => (
                  <label key={p.id} className={`chk-item ${picked.includes(p.name) ? 'checked' : ''}`}>
                    <input type="checkbox" checked={picked.includes(p.name)}
                      onChange={() => setPicked((cur) =>
                        cur.includes(p.name) ? cur.filter((x) => x !== p.name) : [...cur, p.name]
                      )} />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="fg">
          <label className="fl" htmlFor="if-other">Other specification</label>
          <input className="inp" id="if-other" name="other_product" placeholder="e.g. 20-inch metal wall clock with custom dial" />
        </div>

        <div className="fg">
          <label className="fl">Customisation required?</label>
          <div className="chk-row">
            <label className={`chk-item ${logo ? 'checked' : ''}`}>
              <input type="checkbox" checked={logo} onChange={() => setLogo(!logo)} />
              <span>Yes, logo printing</span>
            </label>
          </div>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="if-msg">Your requirements<span className="req">*</span></label>
          <textarea className="inp" id="if-msg" name="message" required
            placeholder="Sizes, materials, packaging, target price, delivery deadline…" />
        </div>

        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />

        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Sending…' : 'Send Enquiry'}
        </button>

        <p className="req-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f5c4a" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg>
          We reply within 12 hours. Your details are used only to answer this enquiry.
        </p>
      </form>
    </div>
  );
}
