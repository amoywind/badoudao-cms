/**
 * Serve a stored enquiry drawing.
 *
 * Drawings are kept in D1 as base64 rather than R2, because R2 is not
 * enabled on this account and a buyer's reference drawing is too valuable
 * to drop. They are served from here so the attachment URL in the admin
 * works the same either way: with R2 the row points at /media/…, without
 * it the row points here.
 *
 * Admin-only. The random per-inquiry id is not a secret, and a buyer's
 * drawings are confidential — anyone can send an enquiry, so only the
 * signed-in owner should be able to open one.
 */
import { one } from '@/lib/db';
import { currentUser } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf'
};

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  /* The filename carries the inquiry id and extension: <id>.pdf */
  const name = decodeURIComponent(
    new URL(request.url).pathname.split('/').pop() || ''
  ).replace(/[^a-zA-Z0-9_.-]/g, '');

  const dot = name.lastIndexOf('.');
  const id = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';

  if (!id || !TYPES[ext]) {
    return new Response('Not found', { status: 404 });
  }

  const row = await one(
    'SELECT mime, filename, data FROM attachments WHERE inquiry_id = ? AND data IS NOT NULL LIMIT 1',
    id
  );
  if (!row?.data) return new Response('Not found', { status: 404 });

  /* base64 → bytes without a Node Buffer; the edge runtime has none. */
  const bin = atob(row.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const type = TYPES[ext] || row.mime || 'application/octet-stream';
  const original = String(row.filename || 'drawing');

  return new Response(bytes, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(bytes.length),
      /* force download for PDFs, inline for images so the admin can preview */
      'Content-Disposition': `inline; filename="${original.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
}