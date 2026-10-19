/**
 * Serve an image's display-sized copy.
 *
 * Cards, grids and galleries point here instead of /api/media-file/[id].
 * The original stays where it was — this is a separate read, so nothing
 * about the full-resolution file is lost, and the detail view still loads
 * the real thing when a buyer asks to see it large.
 *
 *   /api/media-thumb/[id]        640px, for cards and grids
 *   /api/media-thumb/[id]?w=1024 the middle tier, for the product gallery
 *
 * The middle tier exists because a srcset with only 640w and 2048w fails a
 * phone in the middle: at 390px and 2x the frame needs ~718 device pixels,
 * so the browser takes the next candidate up — the 954 KB original — for an
 * image displayed 356 CSS px wide. 1024w covers the phone properly and the
 * desktop layout still gets the original.
 *
 * When an image has no thumbnail — anything uploaded before the columns
 * existed — this redirects to the original rather than 404ing. The caller
 * already checks for a null thumb and points at the full image in that case;
 * the redirect is the safety net for a part-filled library, so a missing
 * thumbnail degrades to "slower" and never to "broken picture on a live
 * page".
 */
import { one } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const id = String(params?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return new Response('Not found', { status: 404 });

  /* Only the large tier is opt-in. Anything else means the caller did not
     ask for a specific size, and the 640px copy is the default. */
  const wantLg = new URL(request.url).searchParams.get('w') === '1024';

  const row = await one(
    wantLg
      ? 'SELECT thumb_lg, thumb FROM media WHERE id = ? AND thumb_lg IS NOT NULL'
      : 'SELECT thumb, NULL AS thumb_lg FROM media WHERE id = ? AND thumb IS NOT NULL',
    id
  );

  /* Falling back the other way round: a 640px copy served for a 1024w
     request is still a valid image, and it is better than the original. */
  const b64 = row?.thumb_lg || row?.thumb;

  if (!b64) {
    const orig = await one('SELECT url FROM media WHERE id = ?', id);
    if (!orig?.url) return new Response('Not found', { status: 404 });
    return Response.redirect(new URL(orig.url, request.url), 302);
  }

  /* Thumbnails are written as WebP regardless of what the original was —
     that is the point of them, so the original's stored mime cannot be
     used here. */
  const bin = atob(b64);
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