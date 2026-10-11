import { NextResponse } from 'next/server';
import { all, one, run, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* Statuses mirror the columns the admin UI offers as clickable blocks. */
const STATUSES = ['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost'];

/* ------------------------------------------------------------------ */
/* row → view model                                                    */
/* ------------------------------------------------------------------ */

/* `inquiries.products` is stored as a JSON-encoded string, but every screen
   in the admin treats it as a real array (`i.products.length`,
   `.map`, `.slice().join`). Handing the raw string through makes
   `.join`/`.map` throw and the whole page blanks out, so it is decoded here
   once at the edge instead of being patched in four components. */
function parseProducts(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    /* pre-JSON rows, or a stray comma — show whatever text we have */
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function mapInquiry(row) {
  if (!row) return null;
  return { ...row, products: parseProducts(row.products) };
}

/* ------------------------------------------------------------------ */
/* GET — list enquiries, or one with its quotes                        */
/* ------------------------------------------------------------------ */

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'inquiries', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const statusFilter = searchParams.get('status');
  const q = (searchParams.get('q') || '').trim();

  if (id) {
    const inquiry = await one('SELECT * FROM inquiries WHERE id = ?', id);
    if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const quotes = await all('SELECT * FROM quotes WHERE inquiry_id = ? ORDER BY id DESC', id);

    /* Drawings the buyer uploaded. Kept as its own block so the owner sees
       the file without opening anything — a reference drawing is often the
       whole reason the buyer wrote. */
    const attachments = await all(
      'SELECT id, filename, url, mime, size FROM attachments WHERE inquiry_id = ? ORDER BY id',
      id
    );

    /* The detail screen links the enquiry to the product it came from so the
       owner can quote straight from stock data. Optional — a general enquiry
       has no product_id, hence the guard. */
    let product = null;
    if (inquiry.product_id) {
      const p = await one(
        'SELECT id, name, price_min, price_max, moq, lead_time FROM products WHERE id = ?',
        inquiry.product_id
      );
      if (p) product = p;
    }

    /* Group repeat enquiries from the same address so the owner sees history. */
    const historyRows = await all(
      `SELECT id, created_at, status, quantity, message, products
         FROM inquiries
        WHERE email = ? AND id != ?
        ORDER BY created_at DESC LIMIT 10`,
      inquiry.email,
      id
    );
    const history = historyRows.map((h) => ({ ...h, products: parseProducts(h.products) }));

    /* Activity trail for this enquiry. */
    const logs = await all(
      `SELECT id, user_id, action, entity, summary, created_at
         FROM audit_log
        WHERE entity = 'inquiries' AND entity_id = ?
        ORDER BY id DESC LIMIT 30`,
      id
    );

    return NextResponse.json({
      inquiry: mapInquiry(inquiry),
      quotes,
      history,
      product,
      logs,
      attachments
    });
  }

  /* Filters for the list view. Every branch is parameterised. */
  const where = [];
  const params = [];

  if (statusFilter && STATUSES.includes(statusFilter)) {
    where.push('status = ?');
    params.push(statusFilter);
  }

  if (q) {
    where.push('(company LIKE ? OR email LIKE ? OR name LIKE ? OR country LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const inquiries = await all(
    `SELECT * FROM inquiries ${clause} ORDER BY created_at DESC LIMIT 300`,
    ...params
  );

  /* Counts for the dashboard tiles — computed over the same filtered set so the
     numbers always match what is listed below them. */
  const rows = await all(`SELECT status, created_at FROM inquiries ${clause}`, ...params);

  const stats = { today: 0, week: 0, pending: 0, won: 0, stale: 0 };
  const now = Date.now();
  const dayMs = 86400000;

  for (const r of rows) {
    const age = now - new Date(`${String(r.created_at).replace(' ', 'T')}Z`).getTime();

    if (age < dayMs) stats.today++;
    if (age < dayMs * 7) stats.week++;
    /* "pending" is the follow-up queue: anything not yet closed out. */
    if (r.status !== 'lost' && r.status !== 'won') stats.pending++;
    if (r.status === 'won') stats.won++;
    /* promised reply window is 12h; flag anything untouched past 24h */
    if (r.status === 'new' && age > dayMs) stats.stale++;
  }

  return NextResponse.json({ inquiries: inquiries.map(mapInquiry), stats });
}

/* ------------------------------------------------------------------ */
/* PUT — update status, owner, notes                                   */
/* ------------------------------------------------------------------ */

export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'inquiries', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await one('SELECT * FROM inquiries WHERE id = ?', body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const status = STATUSES.includes(body.status) ? body.status : existing.status;

  /* Omitting `owner` claims the enquiry for whoever is signed in, instead of
     silently keeping it unassigned. */
  let owner = existing.owner;
  if (body.owner !== undefined && body.owner !== null && String(body.owner).trim() !== '') {
    owner = String(body.owner).slice(0, 80);
  } else if (!existing.owner) {
    const who = await one('SELECT name, email FROM users WHERE id = ?', user.id);
    owner = (who?.name || who?.email || user.email || user.id || '').slice(0, 80);
  }
  const ownerNote =
    body.ownerNote !== undefined ? String(body.ownerNote).slice(0, 2000) : existing.owner_note;

  await run(
    `UPDATE inquiries
        SET status = ?, owner = ?, owner_note = ?, updated_at = datetime('now')
      WHERE id = ?`,
    status,
    owner,
    ownerNote,
    body.id
  );

  await log(user.id, 'update', 'inquiries', body.id, `status → ${status}`);

  /* Changing to "quoted" clears an unassigned enquiry so it shows in the queue. */
  return NextResponse.json({ ok: true, status });
}

/* ------------------------------------------------------------------ */
/* POST — record a quote against an enquiry                            */
/* ------------------------------------------------------------------ */

export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'inquiries', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.inquiryId) return NextResponse.json({ error: 'inquiryId is required' }, { status: 400 });

  const qty = Number(body.qty || 0);
  const unitPrice = Number(body.unitPrice || 0);
  const tooling = Number(body.tooling || 0);
  const packaging = Number(body.packaging || 0);
  const leadTime = String(body.leadTime || '').slice(0, 80);

  if (qty <= 0 || unitPrice <= 0) {
    return NextResponse.json({ error: 'qty and unitPrice are required' }, { status: 400 });
  }

  /* Ex Works: freight is quoted separately, so it is not part of the total. */
  const total = qty * unitPrice + tooling + qty * packaging;

  await run(
    `INSERT INTO quotes (inquiry_id, qty, unit_price, total, lead_time, note)
     VALUES (?,?,?,?,?,?)`,
    body.inquiryId,
    qty,
    unitPrice,
    total,
    leadTime,
    String(body.note || '').slice(0, 500)
  );

  await run(
    `UPDATE inquiries SET status = 'quoted', updated_at = datetime('now') WHERE id = ?`,
    body.inquiryId
  );

  await log(user.id, 'create', 'quotes', body.inquiryId, `total ${total.toFixed(2)}`);

  return NextResponse.json({ ok: true, total });
}

/* ------------------------------------------------------------------ */
/* DELETE                                                              */
/* ------------------------------------------------------------------ */

export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'inquiries', 'delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await one('SELECT email FROM inquiries WHERE id = ?', id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  /* quotes cascade via the FK */
  await run('DELETE FROM inquiries WHERE id = ?', id);
  await log(user.id, 'delete', 'inquiries', id, row.email);

  return NextResponse.json({ ok: true });
}