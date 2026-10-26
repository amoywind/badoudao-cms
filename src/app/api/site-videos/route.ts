/**
 * Site video slots — YouTube only.
 *
 * The product videos table holds a video per product. These hold the
 * videos that belong to the site rather than to a product: the factory
 * footage on the home page, the four process clips on the quality page,
 * the drop test on a product page.
 *
 * YouTube rather than self-hosted video. A factory film is watched once
 * by a buyer who is deciding whether to send an order; it is not a
 * product gallery. Self-hosting would mean an R2 bucket, a CDN cost and
 * a transcode step for a file that plays exactly once, and YouTube's
 * own thumbnail is already a usable poster frame.
 *
 * The admin may paste a link or an embed snippet. Both are reduced to
 * the eleven-character id on the way in, and the player is built from
 * that id — so a pasted snippet cannot bring another origin or a script
 * along with it.
 */
import { NextResponse } from 'next/server';
import { all, one, run, log, youtubeId, VIDEO_SLOTS } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* GET — every slot, with the ones that have no video still listed so
   the admin can see what is outstanding. */
export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await all(
    'SELECT slot, youtube_id, title, sort_order FROM site_videos ORDER BY sort_order, slot'
  );

  /* The row type is written out rather than inferred. The query helper
     returns untyped rows, and an inferred element type of `unknown`
     makes every property access on it an error — which is the point of
     the annotation: the shape is stated once, here. */
  const filled = new Map<string, { slot: string; youtubeId: string; title: string; sortOrder: number }>(
    rows.map((r) => {
      const row = r as {
        slot: string;
        youtube_id: string;
        title: string;
        sort_order: number;
      };
      return [
        String(row.slot),
        {
          slot: String(row.slot),
          youtubeId: String(row.youtube_id || ''),
          title: String(row.title || ''),
          sortOrder: Number(row.sort_order ?? 0)
        }
      ];
    })
  );

  /* The slots the front end looks for, with whatever is filled in.
     A slot that has no row yet comes back with an empty id rather than
     being absent, so the admin page does not have to know the list. */
  const slots = Object.keys(VIDEO_SLOTS).map((key, i) => {
    const row = filled.get(key);
    return {
      slot: key,
      label: VIDEO_SLOTS[key as keyof typeof VIDEO_SLOTS],
      youtubeId: row?.youtubeId || '',
      title: row?.title || '',
      sortOrder: row?.sortOrder ?? i,
      url: row?.youtubeId
        ? `https://www.youtube.com/watch?v=${row.youtubeId}`
        : ''
    };
  });

  return NextResponse.json({ slots });
}

/* POST — set or clear one slot. */
export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const slot = String(body?.slot || '').trim();

  if (!slot || !(slot in VIDEO_SLOTS)) {
    return NextResponse.json({ error: 'Unknown video slot' }, { status: 400 });
  }

  const title = String(body?.title || '').slice(0, 160);

  /* An empty value clears the slot rather than storing an empty id.
     The front end asks "is there a video here", and a row with a blank
     id would have to be answered differently from no row at all. */
  const raw = String(body?.youtubeId || body?.url || '').trim();
  if (!raw) {
    await run('DELETE FROM site_videos WHERE slot = ?', slot);
    await log(user.id, 'delete', 'site_videos', slot, '');
    return NextResponse.json({ ok: true, cleared: true });
  }

  const vid = youtubeId(raw);
  if (!vid) {
    return NextResponse.json(
      {
        error:
          'That does not look like a YouTube video. Paste a link, an embed snippet, or an 11-character id.'
      },
      { status: 400 }
    );
  }

  const existing = await one(
    'SELECT sort_order FROM site_videos WHERE slot = ?',
    slot
  );

  if (existing) {
    await run(
      'UPDATE site_videos SET youtube_id = ?, title = ?, updated_at = datetime(\'now\') WHERE slot = ?',
      vid,
      title,
      slot
    );
  } else {
    const max = await one('SELECT COALESCE(MAX(sort_order), -1) AS m FROM site_videos');
    await run(
      'INSERT INTO site_videos (slot, youtube_id, title, sort_order) VALUES (?,?,?,?)',
      slot,
      vid,
      title,
      Number(max?.m ?? -1) + 1
    );
  }

  await log(user.id, 'update', 'site_videos', slot, vid);

  return NextResponse.json({ ok: true, youtubeId: vid });
}
