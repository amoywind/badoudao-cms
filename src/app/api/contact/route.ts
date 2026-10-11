import { NextResponse } from 'next/server';
import { one, run, uid } from '@/lib/db';

export const runtime = 'edge';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
/* The browser check is advisory only, so the limit is enforced again here. */
const MAX_DRAWING = 2 * 1024 * 1024;
const MAX_BODY = 16 * 1024 * 1024;
const MIN_MS = 3000;
const MAX_MS = 86_400_000;

const QUANTITIES = ['500 - 999', '1,000 - 2,999', '3,000 - 9,999', '10,000+', 'Not sure yet'];
const DRAWING_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const clean = (v, max = 500) =>
  String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const hits = new Map();

function rateLimited(ip, limit = 5, windowMs = 3_600_000) {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now > e.resetAt) {
    hits.set(ip, { n: 1, resetAt: now + windowMs });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  e.n += 1;
  return e.n > limit;
}

export async function POST(request) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';

  /* The form posts JSON when there is no drawing and multipart when there
     is, so the common path skips body re-parsing entirely. */
  const isMultipart = (request.headers.get('Content-Type') || '').includes('multipart/form-data');

  let body;
  let drawing = null;

  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many enquiries. Please email us directly.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  try {
    if (isMultipart) {
      const fd = await request.formData();
      body = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') body[k] = v;
      }
      const f = fd.get('drawing');
      if (f && typeof f !== 'string' && f.size > 0) drawing = f;
    } else {
      const raw = await request.text();
      if (raw.length > MAX_BODY) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
      body = JSON.parse(raw);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  /* honeypot — pretend it worked */
  if (body.website) return NextResponse.json({ ok: true });

  const ts = Number(body.ts);
  if (ts > 0) {
    const elapsed = Date.now() - ts;
    if (elapsed < MIN_MS) {
      return NextResponse.json({ error: 'Submitted too quickly, please try again' }, { status: 400 });
    }
    if (elapsed > MAX_MS) return NextResponse.json({ ok: true });
  }

  const email = clean(body.email, 254);
  const message = clean(body.message, 3000);
  const quantity = clean(body.quantity, 40);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid business email' }, { status: 400 });
  }
  if (!QUANTITIES.includes(quantity)) {
    return NextResponse.json({ error: 'Please select a quantity range' }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: 'Please describe what you need' }, { status: 400 });
  }

  const products = (Array.isArray(body.products) ? body.products : [])
    .map((p) => clean(p, 120))
    .filter(Boolean)
    .slice(0, 12);

  /* link to a real product when the name matches */
  let productId = null;
  if (products.length) {
    const first = products[0].replace(/^Other:\s*/i, '');
    const m = await one(
      'SELECT id FROM products WHERE name = ? OR id = ? OR slug = ? LIMIT 1',
      first, first, first
    );
    if (m) productId = m.id;
  }

  const id = uid('inq');

  /* Validate the drawing before the inquiry row exists, so a rejected file
     never leaves an empty enquiry behind. */
  let stored = null;
  if (drawing) {
    if (drawing.size > MAX_DRAWING) {
      return NextResponse.json(
        { error: 'Drawing is larger than 2 MB. Please send a smaller file or share a link.' },
        { status: 413 }
      );
    }
    const mime = drawing.type || '';
    if (!DRAWING_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: 'Only images and PDF files are accepted.' },
        { status: 415 }
      );
    }
    stored = await storeDrawing(drawing, id);
    /* A storage failure must not cost us the enquiry — record the row with
       has_attachment = 0 and tell the buyer to email the file separately. */
    if (!stored) {
      console.error('drawing upload failed for', id);
    }
  }

  await run(
    `INSERT INTO inquiries
      (id, email, name, company, country, whatsapp, products, quantity, custom_logo,
       message, product_id, source_page, status, has_attachment,
       utm_source, utm_medium, utm_campaign, referrer, ip, country_code)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'new', ?, ?,?,?,?,?,?)`,
    id,
    email,
    clean(body.name, 120),
    clean(body.company, 200),
    clean(body.country, 120),
    clean(body.whatsapp, 24),
    JSON.stringify(products),
    quantity,
    body.custom_logo === 'yes' ? 'yes' : 'no',
    message,
    productId,
    clean(body.sourcePage, 300),
    stored ? 1 : 0,
    clean(body.utmSource, 100),
    clean(body.utmMedium, 100),
    clean(body.utmCampaign, 100),
    clean(body.referrer, 300),
    ip,
    request.headers.get('CF-IPCountry') || ''
  );

  notify({
    id, email, message, products, quantity,
    company: clean(body.company, 200),
    whatsapp: clean(body.whatsapp, 24),
    drawing: stored ? stored.filename : ''
  });

  return NextResponse.json({
    ok: true,
    id,
    /* Warn only when a file was actually sent and could not be kept — most
       enquiries have no attachment, and a warning on every successful
       submission trains the buyer to ignore it. */
    ...(drawing && !stored
      ? { warning: 'Enquiry saved, but the file could not be stored. Please email it to us.' }
      : {})
  });
}

/* ------------------------------------------------------------------ */
/* drawing upload                                                      */
/* ------------------------------------------------------------------ */

/**
 * Store the buyer's drawing and link it to the enquiry.
 *
 * Needs the R2 bucket. Without MEDIA_BUCKET the enquiry is still saved —
 * returning null is what tells the caller to skip has_attachment — so the
 * site keeps working before R2 is configured.
 */
async function storeDrawing(file, inquiryId) {
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    if (!env?.MEDIA_BUCKET) return null;

    /* Keep only the safe extension. The stored name never uses the
       client's filename, which may contain path separators or unicode. */
    const ext = (file.name.split('.').pop() || 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 5) || 'bin';
    const key = `drawings/${inquiryId}-${Date.now()}.${ext}`;

    const buf = await file.arrayBuffer();
    await env.MEDIA_BUCKET.put(key, buf, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });

    const url = `/media/${key}`;
    const filename = file.name.slice(0, 160) || 'drawing';

    await run(
      `INSERT INTO attachments (id, inquiry_id, filename, url, mime, size)
       VALUES (?,?,?,?,?,?)`,
      uid('att'),
      inquiryId,
      filename,
      url,
      file.type || '',
      file.size
    );

    return { url, filename };
  } catch (err) {
    console.error('storeDrawing:', err.message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* email notification — fire and forget, never blocks the response      */
/* ------------------------------------------------------------------ */

async function notify(d) {
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    if (!env?.RESEND_API_KEY || !env?.INBOX_EMAIL) return;

    const rows = [
      ['Email', d.email, true],
      ['WhatsApp', d.whatsapp || '—', true],
      ['Company', d.company || '—', false],
      ['Products', d.products.length ? d.products.join('<br>') : '—', false],
      ['Quantity', d.quantity, true],
      ['Attachment', d.drawing || '—', false]
    ]
      .map(
        ([label, value, strong]) => `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f1f3;color:#6b7280;width:150px">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f1f3;${strong ? 'font-weight:600' : ''}">${esc(value)}</td>
    </tr>`
      )
      .join('');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.MAIL_FROM || 'Badoudao Website <website@badoudao.com>',
        to: [env.INBOX_EMAIL],
        reply_to: d.email,
        subject: `[Enquiry] ${d.products[0] || 'General'} — ${d.quantity}`.slice(0, 180),
        html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0f5c4a;color:#fff;padding:18px 24px;font-weight:700;font-size:18px">BADOU<span style="color:#4db894">DAO</span></div>
  <div style="padding:24px">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111417">New website enquiry</h2>
    <p style="margin:0 0 18px;color:#6b7280;font-size:13px">${esc(d.id)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
    <table style="width:100%;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;overflow:hidden">${rows}</table>
    <div style="margin-top:18px;background:#fafbfc;border-left:3px solid #0f5c4a;padding:14px;font-size:14px;line-height:1.7;color:#3d4450;white-space:pre-wrap">${esc(d.message)}</div>
    <a href="${(env.SITE_URL || 'https://badoudao.pages.dev').replace(/\/$/, '')}/admin/inquiries/${esc(d.id)}"
       style="display:inline-block;margin-top:20px;background:#0f5c4a;color:#fff;padding:11px 22px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">Open in dashboard</a>
    <p style="margin:18px 0 0;font-size:12px;color:#9aa1ac">Reply within 12 hours to keep the enquiry.</p>
  </div>
</div>`
      })
    });
  } catch (err) {
    /* never fail the request because email did not send —
       the inquiry is already stored in D1 */
    console.error('notify failed:', err.message);
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}