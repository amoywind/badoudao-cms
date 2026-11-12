import { NextResponse } from 'next/server';
import { one, all, run, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';
import { mdToHtml } from '@/lib/markdown';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Static pages (About, Factory, Quality…). Body is plain text with line
 * breaks; the front-end renderer converts it to paragraphs.
 */

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const page = await one('SELECT * FROM pages WHERE id = ? OR slug = ?', id, id);
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  }

  const pages = await all('SELECT * FROM pages ORDER BY sort_order, title');
  return NextResponse.json({ pages });
}

/* The admin offers "顶部导航" as top_nav, but the old whitelist only knew
   footer columns — choosing it saved an empty string and the item vanished
   from the header. `content` and the footer_* values are kept because real
   rows already carry them; placement is only ever queried for top_nav, so
   those values are harmless history rather than a second nav slot. */
const PLACEMENTS = ['top_nav', 'content', 'footer_2', 'footer_3', 'footer_4'];
const FOOTER_SLOTS = ['footer_2', 'footer_3', 'footer_4'];

function normPlacement(v) {
  const t = String(v ?? '').trim();
  return PLACEMENTS.includes(t) ? t : '';
}

function normFooterSlot(v) {
  const t = String(v ?? '').trim();
  return FOOTER_SLOTS.includes(t) ? t : '';
}

export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.title) {
    return NextResponse.json({ error: 'ID and title are required' }, { status: 400 });
  }

  const dup = await one('SELECT id FROM pages WHERE id = ?', body.id);
  if (dup) return NextResponse.json({ error: 'This page already exists' }, { status: 409 });

  /* New rows are always documents. Fixed routes are seeded by the migration
     and nav entries by 0003/0004 — letting a client pick `kind` here would
     recreate the ambiguity 0020 exists to remove. */
  await run(
    `INSERT INTO pages (id, slug, title, heading, intro, body, seo_title, seo_description, meta_keywords, kind, status, sort_order, placement, footer_slot, show_in_nav)
     VALUES (?,?,?,?,?,?,?,?,?,'content',?,?,?,?,?)`,
    String(body.id).slice(0, 60),
    String(body.slug || body.id).slice(0, 80),
    String(body.title).slice(0, 200),
    String(body.heading || body.title).slice(0, 200),
    String(body.intro || '').slice(0, 600),
    mdToHtml(String(body.body || '')),
    String(body.seoTitle || '').slice(0, 200),
    String(body.seoDescription || '').slice(0, 300),
    String(body.metaKeywords || '').slice(0, 600),
    body.status || 'published',
    Number(body.sortOrder) || 0,
    normPlacement(body.placement),
    normFooterSlot(body.footerSlot),
    body.show_in_nav ? 1 : 0
  );

  await log(user.id, 'create', 'pages', body.id, body.title);
  return NextResponse.json({ ok: true });
}

export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await one('SELECT * FROM pages WHERE id = ?', body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  /* The editor shows different fields for each kind, but the boundary has
     to hold here too: a fixed route must never acquire a body it cannot
     render, and a menu entry must never acquire SEO no page will read.
     Without this, editing "About Factory" in the admin silently changed a
     title that the navigation never used — the original symptom. */
  const kind = String(existing.kind || 'content');

  if (kind === 'fixed') {
    /* SEO only. `title`/`status` are not writable: the route and its
       visibility are part of the site's structure, not content. */
    await run(
      `UPDATE pages SET seo_title = ?, seo_description = ?, meta_keywords = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      String(body.seoTitle ?? existing.seo_title).slice(0, 200),
      String(body.seoDescription ?? existing.seo_description).slice(0, 300),
      String(body.metaKeywords ?? existing.meta_keywords).slice(0, 600),
      body.id
    );
  } else if (kind === 'nav') {
    await run(
      `UPDATE pages SET
         title = ?, nav_label = ?, external_key = ?, nav_order = ?,
         placement = ?, footer_slot = ?, show_in_nav = ?, sort_order = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      String(body.title ?? existing.title).slice(0, 200),
      String(body.navLabel ?? existing.nav_label).slice(0, 200),
      String(body.externalKey ?? existing.external_key).slice(0, 120),
      Number(body.navOrder ?? existing.nav_order) || 0,
      /* undefined means "not sent" — keep what is there. An empty string is
         a deliberate unassignment, so the item leaves the column. */
      body.placement === undefined
        ? (existing.placement || '')
        : normPlacement(body.placement),
      body.footerSlot === undefined
        ? (existing.footer_slot || '')
        : normFooterSlot(body.footerSlot),
      body.show_in_nav === undefined
        ? (existing.show_in_nav ?? 0)
        : (body.show_in_nav ? 1 : 0),
      Number(body.sortOrder ?? existing.sort_order) || 0,
      body.id
    );
  } else {
    /* content: the full document editor. */
    await run(
      `UPDATE pages SET
         title = ?, heading = ?, intro = ?, body = ?,
         seo_title = ?, seo_description = ?, meta_keywords = ?,
         status = ?, sort_order = ?, placement = ?, footer_slot = ?, show_in_nav = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      String(body.title ?? existing.title).slice(0, 200),
      String(body.heading ?? existing.heading).slice(0, 200),
      String(body.intro ?? existing.intro).slice(0, 600),
      mdToHtml(String(body.body ?? existing.body)),
      String(body.seoTitle ?? existing.seo_title).slice(0, 200),
      String(body.seoDescription ?? existing.seo_description).slice(0, 300),
      String(body.metaKeywords ?? existing.meta_keywords).slice(0, 600),
      body.status ?? existing.status,
      Number(body.sortOrder ?? existing.sort_order) || 0,
      body.placement === undefined
        ? (existing.placement || '')
        : normPlacement(body.placement),
      body.footerSlot === undefined
        ? (existing.footer_slot || '')
        : normFooterSlot(body.footerSlot),
      /* Both the header and the footer filter on this, so a page assigned to
         either but left switched off appears in neither. */
      body.show_in_nav === undefined
        ? (existing.show_in_nav ?? 0)
        : (body.show_in_nav ? 1 : 0),
      body.id
    );
  }

  await log(user.id, 'update', 'pages', body.id, body.title || '');
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await one('SELECT title, kind FROM pages WHERE id = ?', id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  /* A fixed row is the SEO record for a route that exists in src/app.
     Deleting it would not remove the page — it would just make its SEO
     uneditable and leave the admin list missing an entry the site still
     serves. Removing one means removing the route from the code too. */
  if (row.kind === 'fixed') {
    return NextResponse.json(
      { error: '固定页由站点代码提供，不能在此删除' },
      { status: 403 }
    );
  }

  await run('DELETE FROM pages WHERE id = ?', id);
  await log(user.id, 'delete', 'pages', id, row.title);

  return NextResponse.json({ ok: true });
}