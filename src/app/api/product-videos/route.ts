/**
 * Product videos — YouTube only.
 *
 * Self-hosting video would mean an R2 bucket, a CDN cost and a transcode
 * step for something a buyer watches once. YouTube is free, fast, and its
 * thumbnail is already a poster frame, so only the 11-character id is
 * stored.
 *
 * The id is normalised on the way in: an admin can paste either a bare id
 * or any of the share/embed/watch URL shapes and get the same result.
 */
import { NextResponse } from 'next/server';
import { all, one, run, log, youtubeId } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get('productId');
  if (!id) return NextResponse.json({ error: 'productId is required' }, { status: 400 });

  const rows = await all(
    'SELECT * FROM product_videos WHERE product_id = ? ORDER BY sort_order, id',
    id
  );
  return NextResponse.json({ videos: rows });
}

export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  }

  const vid = youtubeId(body.youtubeId || body.url || '');
  if (!vid) {
    return NextResponse.json(
      { error: 'That does not look like a YouTube video. Paste a link or an 11-character id.' },
      { status: 400 }
    );
  }

  const product = await one('SELECT id FROM products WHERE id = ?', body.productId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const max = await one(
    'SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_videos WHERE product_id = ?',
    body.productId
  );

  await run(
    'INSERT INTO product_videos (product_id, youtube_id, title, sort_order) VALUES (?,?,?,?)',
    body.productId,
    vid,
    String(body.title || '').slice(0, 160),
    Number(max?.m ?? -1) + 1
  );

  await log(user.id, 'create', 'product_videos', body.productId, vid);

  return NextResponse.json({ ok: true, youtubeId: vid });
}

export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await one('SELECT product_id, youtube_id FROM product_videos WHERE id = ?', id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await run('DELETE FROM product_videos WHERE id = ?', id);
  await log(user.id, 'delete', 'product_videos', row.product_id, row.youtube_id);

  return NextResponse.json({ ok: true });
}