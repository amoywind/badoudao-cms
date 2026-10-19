/**
 * Serve an image's display-sized copy.
 *
 * Every card, grid and gallery on the site points here instead of
 * /api/media-file/[id]. The original stays where it was — this is a separate
 * read, so nothing about the full-resolution file is lost, and the detail
 * view still loads the real thing when a buyer asks to see it large.
 *
 * When an image has no thumbnail — anything uploaded before the column
 * existed — this redirects to the original rather than 404ing. The caller
 * already checks for a null thumb and points at the full image in that case;
 * the redirect is the safety net for a half-filled library, so a missing
 * thumbnail degrades to "slower" and never to "broken picture on a live page".
 */
import { one } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const id = String(params?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return new Response('Not found', { status: 404 });

  const row = await one(
    'SELECT thumb, mime, url FROM media WHERE id = ? AND thumb IS NOT NULL',
    id
  );

  if (!row?.thumb) {
    const orig = await one('SELECT url FROM media WHERE id = ?', id);
    if (!orig?.url) return new Response('Not found', { status: 404 });
    return Response.redirect(new URL(orig.url, _request.url), 302);
  }

  /* Thumbnails are written as WebP regardless of what the original was —
     that is the point of them. The stored mime is the original's, so it
     cannot be used here. */
  const bin = atob(row.thumb);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(bytes.length),
      /* Same argument as the original: the id is fixed for the life of the
         file, so a year-long immutable cache is safe and the thumbnail is
         fetched once per visitor rather than once per page view. */
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}