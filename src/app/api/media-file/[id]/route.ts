/**
 * Serve an image held in D1.
 *
 * Only used for uploads made while R2 was unavailable — the media row's
 * url points here instead of /media/…, decided at upload time. Enabling R2
 * later therefore needs no data migration.
 *
 * Public, and deliberately cacheable. A product photo is public by nature;
 * these ids are not guessable and the payload is already compressed JPEG
 * or WebP, so there is nothing here worth protecting. Hashed caching lets
 * the edge keep the image indefinitely — the id changes if the file does.
 */
import { one } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const id = String(params?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return new Response('Not found', { status: 404 });

  const row = await one(
    'SELECT mime, data, filename FROM media WHERE id = ? AND data IS NOT NULL',
    id
  );
  if (!row?.data) return new Response('Not found', { status: 404 });

  const bin = atob(row.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      'Content-Type': row.mime || 'image/jpeg',
      'Content-Length': String(bytes.length),
      /* The id changes whenever the file does, so a year is safe and the
         buyer-facing pages never re-download a product photo. */
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${String(row.filename || id).replace(/"/g, '')}"`
    }
  });
}