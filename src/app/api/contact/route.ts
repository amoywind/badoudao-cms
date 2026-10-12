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

  /* The browser strips formatting before sending, but the API accepts
     calls from anywhere — normalise here too so "+1 555-123-4567" and
     "15551234567" are stored the same way and searchable together. */
  const whatsapp = clean(body.whatsapp, 24).replace(/(?!^\+)\D+/g, '');

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

  /* Validate the drawing before anything is written, so a rejected file
     never leaves a half-finished enquiry behind. */
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
  }

  /* The enquiry row has to exist before the drawing can be attached:
     attachments.inquiry_id carries a foreign key to inquiries, and storing
     the file first fails with SQLITE_CONSTRAINT_FOREIGNKEY — which is how
     every uploaded drawing was being silently dropped while the buyer was
     told their enquiry had been saved. The order is validate → insert
     enquiry → store file. */

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
    whatsapp,
    JSON.stringify(products),
    quantity,
    body.custom_logo === 'yes' ? 'yes' : 'no',
    message,
    productId,
    clean(body.sourcePage, 300),
    /* The row is inserted before the file is stored, because
       attachments.inquiry_id is a foreign key to this table. The flag is
       corrected immediately below rather than guessed at this point. */
    0,
    clean(body.utmSource, 100),
    clean(body.utmMedium, 100),
    clean(body.utmCampaign, 100),
    clean(body.referrer, 300),
    ip,
    request.headers.get('CF-IPCountry') || ''
  );

  /* Now that the enquiry exists, the drawing can be attached. Storing it
     first failed with SQLITE_CONSTRAINT_FOREIGNKEY, which is why every
     uploaded drawing was dropped while the buyer was told their enquiry
     had been saved. */
  let stored = null;
  if (drawing) {
    stored = await storeDrawing(drawing, id);
    /* A storage failure must not cost us the enquiry — record it as sent
       without a file and tell the buyer to email it separately. */
    if (stored) {
      await run('UPDATE inquiries SET has_attachment = 1 WHERE id = ?', id);
    } else {
      console.error('drawing upload failed for', id);
    }
  }

  notify({
    id, email, message, products, quantity,
    company: clean(body.company, 200),
    whatsapp,
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
 * Drawings are small (2 MB cap) and low-volume, so they are kept in D1 as
 * base64 rather than depending on R2. That matters: R2 is not enabled on
 * this account, and silently dropping a buyer's reference drawing is worse
 * than storing it in the database. Product photography still uses R2 —
 * it is served on every page and belongs in object storage.
 *
 * Returns null only when neither path worked.
 */
async function storeDrawing(file, inquiryId) {
  const filename = file.name.slice(0, 160) || 'drawing';
  const mime = file.type || 'application/octet-stream';

  /* Prefer R2 when it is bound — it is the better home for binary data. */
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();

    if (env?.MEDIA_BUCKET) {
      const ext = (file.name.split('.').pop() || 'bin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 5) || 'bin';
      const key = `drawings/${inquiryId}-${Date.now()}.${ext}`;
      const buf = await file.arrayBuffer();

      await env.MEDIA_BUCKET.put(key, buf, {
        httpMetadata: { contentType: mime }
      });

      const url = `/media/${key}`;
      await run(
        `INSERT INTO attachments (id, inquiry_id, filename, url, mime, size, data)
         VALUES (?,?,?,?,?,?, NULL)`,
        uid('att'), inquiryId, filename, url, mime, file.size
      );
      return { url, filename };
    }
  } catch (err) {
    console.error('R2 drawing upload failed, falling back to D1:', err.message);
  }

  /* D1 fallback: 2 MB decoded is ~2.7 MB of text, well inside a row. */
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    /* Chunked to stay clear of the argument-count limit on large strings. */
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
    }
    const b64 = btoa(bin);

    const ext = (filename.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
    const url = `/api/drawing/${inquiryId}.${ext}`;

    await run(
      `INSERT INTO attachments (id, inquiry_id, filename, url, mime, size, data)
       VALUES (?,?,?,?,?,?,?)`,
      uid('att'), inquiryId, filename, url, mime, file.size, b64
    );
    return { url, filename };
  } catch (err) {
    console.error('D1 drawing store failed:', err.message);
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
    <a href="${(env.SITE_URL || 'https://oemwallclocks.com').replace(/\/$/, '')}/admin/inquiries/${esc(d.id)}"
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