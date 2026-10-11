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

  await run(
    `INSERT INTO pages (id, slug, title, heading, intro, body, seo_title, seo_description, status, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    String(body.id).slice(0, 60),
    String(body.slug || body.id).slice(0, 80),
    String(body.title).slice(0, 200),
    String(body.heading || body.title).slice(0, 200),
    String(body.intro || '').slice(0, 600),
    mdToHtml(String(body.body || '')),
    String(body.seoTitle || '').slice(0, 200),
    String(body.seoDescription || '').slice(0, 300),
    body.status || 'published',
    Number(body.sortOrder) || 0
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

  await run(
    `UPDATE pages SET
       title = ?, heading = ?, intro = ?, body = ?,
       seo_title = ?, seo_description = ?, status = ?, sort_order = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    String(body.title ?? existing.title).slice(0, 200),
    String(body.heading ?? existing.heading).slice(0, 200),
    String(body.intro ?? existing.intro).slice(0, 600),
    mdToHtml(String(body.body ?? existing.body)),
    String(body.seoTitle ?? existing.seo_title).slice(0, 200),
    String(body.seoDescription ?? existing.seo_description).slice(0, 300),
    body.status ?? existing.status,
    Number(body.sortOrder ?? existing.sort_order) || 0,
    body.id
  );

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

  const row = await one('SELECT title FROM pages WHERE id = ?', id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await run('DELETE FROM pages WHERE id = ?', id);
  await log(user.id, 'delete', 'pages', id, row.title);

  return NextResponse.json({ ok: true });
}