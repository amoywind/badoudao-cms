import { NextResponse } from 'next/server';
import { one, all, run, uid, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';

/* Per-file upload ceiling. Product photography is square and web-optimised,
   so a 1 MB cap keeps pages fast without rejecting real shots. */
const MAX_UPLOAD = 1024 * 1024;

/* Thumbnails are ~20-35 KB. This ceiling is not about what a legitimate
   640px WebP weighs — it is about not letting a malformed client park 1 MB
   of base64 per file in a column nothing reads. */
const MAX_THUMB = 256 * 1024;

/**
 * Bytes to base64, without spending the CPU budget on string building.
 *
 * The first version assembled a binary string byte by byte in 8 KB slices
 * and called btoa on the result. That worked and then it did not: a 1 MB
 * file meant 128 rounds of Array.from plus string concatenation, and
 * Cloudflare Workers caps CPU time, not just memory. Uploading a handful of
 * images in one request exceeded it and every file in the batch came back
 * as Error 1102 — "Worker exceeded resource limits" — which names nothing
 * about the cause.
 *
 * Blob.arrayBuffer is the same decode the engine would do anyway, done in
 * native code: no intermediate string, no per-byte JS loop. On a megabyte
 * it is roughly two orders of magnitude less CPU.
 */
async function toBase64(bytes: Uint8Array): Promise<string> {
  const blob = new Blob([bytes as unknown as BlobPart]);
  const buf = await blob.arrayBuffer();
  /* Chunked rather than one String.fromCharCode(...buf): spreading a
     megabyte onto the call stack is the exception this originally existed
     to avoid, and 0x8000 is comfortably inside it. */
  let bin = '';
  const CHUNK = 0x8000;
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i += CHUNK) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(u8.subarray(i, i + CHUNK)) as unknown as number[]
    );
  }
  return btoa(bin);
}

/**
 * Collect the thumbnails belonging to file `index`, split by tier.
 *
 * The client names each blob thumb-<fileIndex>-<width>-<n>.webp and appends
 * them in order, so both the pairing and the tier come out of the filename.
 * Anything unrecognized is ignored rather than guessed at — a misrouted
 * thumbnail would show the wrong picture size on a live page, and storing
 * nothing just falls back to the original.
 */
async function readThumbs(
  thumbs: File[],
  index: number
): Promise<{ thumb: string | null; thumbLg: string | null }> {
  const out: { thumb: string | null; thumbLg: string | null } = {
    thumb: null,
    thumbLg: null
  };

  for (const f of thumbs) {
    const m = /thumb-(\d+)-(\d+)-/.exec(f.name || '');
    if (!m) continue;
    if (parseInt(m[1], 10) !== index) continue;

    const buf = await f.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_THUMB) continue;

    const b64 = await toBase64(new Uint8Array(buf));
    if (parseInt(m[2], 10) >= 1024) out.thumbLg = b64;
    else out.thumb = b64;
  }

  return out;
}

/**
 * Images live in Cloudflare R2, bound as MEDIA_BUCKET. Uploads go
 * straight to the bucket through this route so the admin session is the
 * only way in.
 */

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'media', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  const tag = searchParams.get('tag');

  const where = [];
  const params = [];
  if (folder) { where.push('folder = ?'); params.push(folder); }
  if (tag) { where.push('tag = ?'); params.push(tag); }

  /* Column list, not SELECT *.

     The `data` column holds the file's base64 — for this library that is
     9.26 MB across 23 images. SELECT * dragged every byte of it into the
     response, so listing the media library meant reading and JSON-serialising
     nine megabytes of binary on a Worker whose CPU budget is 10 ms of work
     per request. That is what produced the "exceeded resource limits"
     failures in the admin, and it happened on the media page, on every
     product editor, and every time the markdown editor's image picker opened
     — three separate entry points to the same expensive query.

     `thumb` is reduced to a boolean on the way out for the same reason: it is
     another 714 KB of base64, and the admin only ever asks "does this image
     have one?" in order to build a URL. The payload is served by
     /api/media-thumb/[id]. */
  const media = await all(
    `SELECT id, filename, url, mime, size, width, height, alt, folder, tag,
            created_at,
            CASE WHEN thumb IS NULL THEN 0 ELSE 1 END AS has_thumb
     FROM media ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY created_at DESC LIMIT 500`,
    ...params
  );

  /* where is each image referenced — prevents accidental deletion */
  const usage = await all(
    `SELECT pi.media_id, p.id, p.name, p.slug FROM product_images pi
     JOIN products p ON p.id = pi.product_id`
  );
  const usedBy = {};
  usage.forEach((u) => {
    (usedBy[u.media_id] = usedBy[u.media_id] || []).push({ id: u.id, name: u.name });
  });

  /* Real folder rows, so an empty folder can exist. The previous GROUP BY on
   media.folder only surfaced folders that already had an image in them. */
const folders = await all(
  `SELECT f.id, f.name, f.parent, f.sort_order,
          (SELECT COUNT(*) FROM media m WHERE m.folder = f.name) AS n
     FROM media_folders f
    ORDER BY f.parent, f.sort_order, f.name`
);

  return NextResponse.json({
    /* The flag becomes a URL here so no caller has to know it is a row count
       rather than a path, and nothing downstream needs the column name. */
    media: media.map(({ has_thumb, ...m }) => ({
      ...m,
      thumbUrl: has_thumb ? `/api/media-thumb/${m.id}` : null,
      usedBy: usedBy[m.id] || []
    })),
    folders
  });
}

export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'media', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { getRequestContext } = await import('@cloudflare/next-on-pages');
  const { env } = getRequestContext();

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Expected multipart' }, { status: 400 });

  const files = form.getAll('file').filter((f) => typeof f === 'object' && 'arrayBuffer' in f);
  if (!files.length) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (files.length > 12) {
    return NextResponse.json({ error: 'Max 12 files per upload' }, { status: 400 });
  }

  const folder = String(form.get('folder') || 'uploads').replace(/[^a-z0-9/_-]/gi, '');
  const tag = String(form.get('tag') || '');
  const alt = String(form.get('alt') || '');

  /* Thumbnails, paired with the files by position. The browser makes these
     before uploading — the edge runtime cannot resize, and asking it to
     would spend the very CPU budget that was blowing up on these pages.
     Each filename carries its target width (thumb-<index>-<width>-<n>.webp)
     so the route knows which column it belongs in. A file with no thumb is
     fine: the columns stay NULL and every front-end caller falls back to the
     original. */
  const thumbs = form
    .getAll('thumb')
    .filter((f) => typeof f === 'object' && f && 'arrayBuffer' in f) as File[];

  /* R2 is optional. Without it images go to D1, which is slower to serve but
   free at this site's scale and, more importantly, available at all. */
  const saved = [];
  const errors = [];

  for (const [index, file] of files.entries()) {
    /* file.size is metadata the multipart parser already has. Reading the
       body first and measuring afterwards meant a 20 MB photo was fully
       loaded into the isolate before being rejected — the memory spike
       happened on exactly the uploads that could least afford it. */
    if (file.size > MAX_UPLOAD) {
      const mb = (file.size / 1024 / 1024).toFixed(2);
      errors.push(`${file.name}: ${mb} MB — the limit is 1 MB`);
      continue;
    }

    const mime = file.type || 'application/octet-stream';
    if (!/^image\//.test(mime)) {
      errors.push(`${file.name}: not an image`);
      continue;
    }

    const buf = await file.arrayBuffer();

    /* A second check after reading, because the declared size is a claim
       and this is the measurement. Cheap next to the read that precedes it. */
    if (buf.byteLength > MAX_UPLOAD) {
      const mb = (buf.byteLength / 1024 / 1024).toFixed(2);
      errors.push(`${file.name}: ${mb} MB — the limit is 1 MB`);
      continue;
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const id = uid('img');
    const key = `${folder}/${id}.${ext}`;

    /* R2 when it is bound, D1 when it is not.
       R2 is the better home for anything served on a public page, so it is
       preferred whenever available — but the account cannot switch R2 on
       through the API (error 10042, dashboard only), and a factory site
       with no product photos gets no enquiries. Falling back keeps the
       library usable; the per-row `data` column means enabling R2 later
       needs no migration, only a re-upload of what should move there. */
    let url = `/api/media-file/${id}`;
    let b64: string | null = null;

    if (env?.MEDIA_BUCKET) {
      try {
        await env.MEDIA_BUCKET.put(key, buf, { httpMetadata: { contentType: mime } });
        url = `/media/${key}`;
      } catch (err) {
        console.error('R2 put failed, storing in D1 instead:', err.message);
      }
    }

    if (url.startsWith('/api/')) {
      b64 = await toBase64(new Uint8Array(buf));
    }

    const dims = await imageSize(buf).catch(() => ({ width: 0, height: 0 }));

    /* The 640px and 1024px copies, when the browser sent them. Capped well
       below the original's ceiling: a thumbnail is 20-90 KB in practice, and
       a client that sent something enormous has either misunderstood the
       field or is not the client this route was written for. */
    const tiers = await readThumbs(thumbs, index);

    /* Warn rather than reject on aspect ratio: a non-square image still
       displays correctly thanks to the square crop, and sometimes a wide
       shot is genuinely the better reference. The main-image slot is what
       really needs 1:1, and the admin UI flags it there. */
    const isSquare = dims.width > 0 && dims.height > 0 && dims.width === dims.height;

    await run(
      `INSERT INTO media (id, filename, url, mime, size, width, height, alt, folder, tag, data, thumb, thumb_lg)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      file.name.slice(0, 200),
      url,
      mime,
      buf.byteLength,
      dims.width,
      dims.height,
      alt,
      folder,
      tag,
      b64,
      tiers.thumb,
      tiers.thumbLg
    );

    saved.push({
      id,
      url,
      thumbUrl: tiers.thumb ? `/api/media-thumb/${id}` : null,
      filename: file.name,
      width: dims.width,
      height: dims.height,
      ...(isSquare ? {} : { notice: dims.width > 0
        ? `${dims.width}x${dims.height} is not square — the main image slot prefers 1:1`
        : 'Could not read the image dimensions' })
    });
  }

  await log(user.id, 'upload', 'media', '', `${saved.length} file(s)`);

  return NextResponse.json({ ok: true, saved, errors });
}

export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'media', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await run(
    'UPDATE media SET alt = ?, folder = ?, tag = ? WHERE id = ?',
    String(body.alt || '').slice(0, 200),
    String(body.folder || 'uploads'),
    String(body.tag || ''),
    body.id
  );

  await log(user.id, 'update', 'media', body.id, 'alt / folder / tag');
  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* files                                                                */
/* ------------------------------------------------------------------ */

export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'media', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  /* block deletion while in use */
  const refs = await all(
    'SELECT p.id, p.name FROM product_images pi JOIN products p ON p.id = pi.product_id WHERE pi.media_id = ?',
    id
  );
  if (refs.length) {
    return NextResponse.json(
      {
        error: `Image is used by ${refs.length} product(s): ${refs.map((r) => r.name).join(', ')}`
      },
      { status: 409 }
    );
  }

  const row = await one('SELECT url FROM media WHERE id = ?', id);
  if (row) {
    /* Only files in R2 need a remote delete; D1 copies disappear with the
       row. The url says which storage a given file used. */
    if (row.url.startsWith('/media/')) {
      const { getRequestContext } = await import('@cloudflare/next-on-pages');
      const { env } = getRequestContext();
      try {
        await env?.MEDIA_BUCKET?.delete(row.url.replace('/media/', ''));
      } catch { /* record already gone */ }
    }
  }

  await run('DELETE FROM media WHERE id = ?', id);
  await log(user.id, 'delete', 'media', id, '');

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* Read image dimensions from the file header. Supports PNG, JPEG, GIF,  */
/* WebP — enough to fill the width/height columns.                      */
/* ------------------------------------------------------------------ */

async function imageSize(buf) {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  /* PNG */
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  /* GIF */
  if (bytes.length > 10 && bytes[0] === 0x47 && bytes[1] === 0x49) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }

  /* WEBP */
  if (bytes.length > 30 && bytes[0] === 0x52 && bytes[1] === 0x49) {
    const type = String.fromCharCode(bytes[12], bytes[13], bytes[14]);
    if (type === 'VP8 ') return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (type === 'VP8L') {
      const b = view.getUint32(21, true);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (type === 'VP8X') {
      const w = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
      const h = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
      return { width: w + 1, height: h + 1 };
    }
  }

  /* JPEG — walk the segment chain */
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 9) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      const len = view.getUint16(offset + 2);
      /* SOF0-SOF15, skipping non-frame markers */
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7)
        };
      }
      offset += 2 + len;
    }
  }

  return { width: 0, height: 0 };
}