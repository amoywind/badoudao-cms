import { NextResponse } from 'next/server';
import { one, all, run, uid, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';

/* Per-file upload ceiling. Product photography is square and web-optimised,
   so a 1 MB cap keeps pages fast without rejecting real shots. */
const MAX_UPLOAD = 1024 * 1024;

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

  const media = await all(
    `SELECT * FROM media ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
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
    media: media.map((m) => ({ ...m, usedBy: usedBy[m.id] || [] })),
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

  /* R2 is optional. Without it images go to D1, which is slower to serve but
   free at this site's scale and, more importantly, available at all. */
  const saved = [];
  const errors = [];

  for (const file of files) {
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

    /* Warn rather than reject on aspect ratio: a non-square image still
       displays correctly thanks to the square crop, and sometimes a wide
       shot is genuinely the better reference. The main-image slot is what
       really needs 1:1, and the admin UI flags it there. */
    const isSquare = dims.width > 0 && dims.height > 0 && dims.width === dims.height;

    await run(
      `INSERT INTO media (id, filename, url, mime, size, width, height, alt, folder, tag, data)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
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
      b64
    );

    saved.push({
      id,
      url,
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