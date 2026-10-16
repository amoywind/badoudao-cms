import { NextResponse } from 'next/server';
import { one, all, run, log, slugify } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';
import { clipDescription, DESC_MAX } from '@/lib/category-limits';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* GET — list categories with product counts */
export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cats = await all(
    `SELECT c.*, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category = c.id AND p.status = 'published'
     GROUP BY c.id
     ORDER BY c.sort_order, c.name`
  );

  return NextResponse.json({ categories: cats });
}

/* POST — create */
export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.name) {
    return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
  }

  const id = slugify(body.id);
  const dup = await one('SELECT id FROM categories WHERE id = ?', id);
  if (dup) return NextResponse.json({ error: 'This ID already exists' }, { status: 409 });

  const desc = clipDescription(body.description);

  await run(
    `INSERT INTO categories (id, name, short, description, designs, price_range, sort_order, status)
     VALUES (?,?,?,?,?,?,?,?)`,
    id,
    String(body.name).slice(0, 120),
    String(body.short || body.name).slice(0, 60),
    desc.text,
    String(body.designs || '').slice(0, 40),
    String(body.priceRange || '').slice(0, 60),
    Number(body.sortOrder) || 0,
    body.status || 'published'
  );

  await log(user.id, 'create', 'categories', id, body.name);
  /* dropped > 0 means the owner wrote more than will be stored. Saying so
     is the whole point: the previous 600 limit took three descriptions
     mid-word and the admin was told 已保存. */
  return NextResponse.json({
    ok: true,
    id,
    dropped: desc.dropped,
    limit: DESC_MAX
  });
}

/* PUT — update */
export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await one('SELECT * FROM categories WHERE id = ?', body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  /* reject a rename that would orphan products */
  const moving = body.id !== undefined && body.id !== existing.id;
  if (moving) return NextResponse.json({ error: 'Category ID cannot be changed' }, { status: 400 });

  const desc = clipDescription(body.description ?? existing.description);

  await run(
    `UPDATE categories SET
       name = ?, short = ?, description = ?, designs = ?,
       price_range = ?, sort_order = ?, status = ?
     WHERE id = ?`,
    String(body.name ?? existing.name).slice(0, 120),
    String(body.short ?? existing.short).slice(0, 60),
    desc.text,
    String(body.designs ?? existing.designs).slice(0, 40),
    String(body.priceRange ?? existing.price_range).slice(0, 60),
    Number(body.sortOrder ?? existing.sort_order) || 0,
    body.status ?? existing.status,
    body.id
  );

  await log(user.id, 'update', 'categories', body.id, body.name || '');
  /* See the note on the create path. This is the one that bit: editing a
     category and pressing save silently shortened the description again. */
  return NextResponse.json({
    ok: true,
    dropped: desc.dropped,
    limit: DESC_MAX
  });
}

/* DELETE — blocked while products still reference it */
export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const used = await all('SELECT id, name FROM products WHERE category = ?', id);
  if (used.length) {
    return NextResponse.json(
      {
        error: `${used.length} product(s) still use this category: ${used
          .map((p) => p.name)
          .slice(0, 3)
          .join(', ')}${used.length > 3 ? '…' : ''}. Move or delete them first.`
      },
      { status: 409 }
    );
  }

  await run('DELETE FROM categories WHERE id = ?', id);
  await log(user.id, 'delete', 'categories', id, '');

  return NextResponse.json({ ok: true });
}