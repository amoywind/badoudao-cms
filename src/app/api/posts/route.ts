import { NextResponse } from 'next/server';
import { getDB, one, all, run, uid, slugify, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';
import { mdToHtml } from '@/lib/markdown';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/* GET — list posts, or one post                                      */
/* ------------------------------------------------------------------ */

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const post = await one('SELECT * FROM posts WHERE id = ? OR slug = ?', id, id);
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post });
  }

  const posts = await all('SELECT * FROM posts ORDER BY published_at DESC, created_at DESC LIMIT 200');
  return NextResponse.json({ posts });
}

/* ------------------------------------------------------------------ */
/* POST — create                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const id = uid('post');
  let slug = slugify(body.slug || body.title);
  const taken = await one('SELECT id FROM posts WHERE slug = ?', slug);
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;

  const status = body.status === 'published' ? 'published' : 'draft';
  /* Articles and company news share this table — see the `type` column in
     migration 0002. Only the two known values are accepted so a typo in the
     admin cannot create a third, unrouted kind of post. */
  const type = body.type === 'news' ? 'news' : 'article';

  await run(
    `INSERT INTO posts
      (id, slug, title, excerpt, keyword, body, author, status, published_at,
       seo_title, seo_description, type, cover)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    slug,
    String(body.title).slice(0, 200),
    String(body.excerpt || '').slice(0, 400),
    String(body.keyword || '').slice(0, 120),
    mdToHtml(String(body.body || '')),
    user.name,
    status,
    status === 'published' ? new Date().toISOString() : null,
    String(body.seoTitle || '').slice(0, 200),
    String(body.seoDescription || '').slice(0, 300),
    type,
    String(body.cover || '').slice(0, 400)
  );

  await log(user.id, 'create', 'posts', id, body.title);
  return NextResponse.json({ ok: true, id, slug });
}

/* ------------------------------------------------------------------ */
/* PUT — update                                                        */
/* ------------------------------------------------------------------ */

export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await one('SELECT * FROM posts WHERE id = ?', body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let slug = existing.slug;
  if (body.slug !== undefined && body.slug !== existing.slug) {
    slug = slugify(body.slug);
    const taken = await one('SELECT id FROM posts WHERE slug = ? AND id != ?', slug, body.id);
    if (taken) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
  }

  const status = body.status ?? existing.status;

  /* set published_at the first time it goes live */
  const publishedAt =
    status === 'published' && !existing.published_at
      ? new Date().toISOString()
      : existing.published_at;

  await run(
    `UPDATE posts SET
       slug = ?, title = ?, excerpt = ?, keyword = ?, body = ?,
       status = ?, published_at = ?, seo_title = ?, seo_description = ?,
       type = ?, cover = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    slug,
    String(body.title ?? existing.title).slice(0, 200),
    String(body.excerpt ?? existing.excerpt).slice(0, 400),
    String(body.keyword ?? existing.keyword).slice(0, 120),
    mdToHtml(String(body.body ?? existing.body)),
    status,
    publishedAt,
    String(body.seoTitle ?? existing.seo_title).slice(0, 200),
    String(body.seoDescription ?? existing.seo_description).slice(0, 300),
    /* Only the two known values, same as on create — a stray value would
       put the post under a route that does not exist. */
    body.type === 'news' ? 'news' : body.type === 'article' ? 'article' : (existing.type || 'article'),
    String(body.cover ?? existing.cover ?? '').slice(0, 400),
    body.id
  );

  await log(user.id, 'update', 'posts', body.id, body.title || '');
  return NextResponse.json({ ok: true, slug });
}

/* ------------------------------------------------------------------ */
/* DELETE                                                              */
/* ------------------------------------------------------------------ */

export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'content', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await one('SELECT title FROM posts WHERE id = ?', id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await run('DELETE FROM posts WHERE id = ?', id);
  await log(user.id, 'delete', 'posts', id, row.title);

  return NextResponse.json({ ok: true });
}