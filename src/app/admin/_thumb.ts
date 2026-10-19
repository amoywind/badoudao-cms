/**
 * Make a display-sized copy of an image in the browser, before it is sent.
 *
 * The upload route runs on the Workers edge runtime, which has no native
 * image library — sharp cannot be imported there. That is why the existing
 * library was backfilled from a local script (scripts/backfill-thumbs.js)
 * rather than at upload time.
 *
 * But the browser can do it. Canvas resizing costs the admin's laptop
 * nothing, costs the Worker nothing, and means every image uploaded from now
 * on has a thumbnail without anyone having to remember to run a script.
 * The original still goes up unchanged, so nothing is lost.
 */

const THUMB_WIDTH = 640;
const QUALITY = 0.78;

/**
 * Returns a WebP blob for `file`, or null when a thumbnail cannot be made.
 *
 * Null is a normal outcome, not a failure: a HEIC the browser cannot decode,
 * an image already narrower than the target, or a browser without
 * canvas.toBlob. In every case the original is still uploaded and the
 * front-end falls back to the full-size file, so the worst outcome is a
 * slower page rather than a broken one.
 */
export async function makeThumb(file: File): Promise<Blob | null> {
  /* Below the target already. Upscaling would make it both larger and
     softer than the original, so there is nothing to gain. */
  if (file.size < 24 * 1024) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    if (bitmap.width <= THUMB_WIDTH) return null;

    const scale = THUMB_WIDTH / bitmap.width;
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_WIDTH;
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      /* WebP where the browser has it — a third the bytes of the JPEG at the
         same quality on the flat white product shots. Safari 14+ has it;
         older Safari silently returns a PNG here, which is still correct,
         just larger, and the column stores whatever came out. */
      try {
        canvas.toBlob(resolve, 'image/webp', QUALITY);
      } catch {
        resolve(null);
      }
    });

    return blob;
  } catch {
    return null;
  } finally {
    bitmap.close?.();
  }
}

/**
 * Read a File as base64, for the thumb column.
 *
 * Done with FileReader rather than a manual byte loop: the point of the
 * previous CPU fix was to stop assembling megabyte strings byte by byte on
 * the server, and reintroducing that on the client would be the same mistake
 * in a place that cannot afford it either.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      /* FileReader yields "data:image/webp;base64,XXXX" — the column holds
         the payload only, matching what the server's toBase64 produced. */
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Build the FormData for an upload, attaching a thumbnail per file.
 *
 * The thumb travels as a parallel `thumbs` field in the same order as
 * `files`, rather than as a named field per file: the route reads
 * form.getAll('thumbs') and pairs by index, and a file with no thumb simply
 * stores NULL and falls back to the original on the front end.
 */
export async function buildUploadForm(
  files: FileList | File[],
  folder: string,
  extra?: Record<string, string>
): Promise<FormData> {
  const list = Array.from(files);
  const form = new FormData();

  const thunks = list.map((f) => makeThumb(f));
  const thumbs = await Promise.all(thunks);

  list.forEach((f, i) => {
    form.append('file', f);
    const t = thumbs[i];
    if (t) form.append('thumb', t, `thumb-${i}.webp`);
  });

  form.append('folder', folder);
  Object.entries(extra || {}).forEach(([k, v]) => form.append(k, v));
  return form;
}