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
/* The product gallery's middle tier. A 390px phone at 2x needs about 718
   device pixels, so a 640px copy alone makes the srcset jump straight to the
   954 KB original. 1024w covers the phone properly; the desktop layout still
   gets the full-resolution file. */
const THUMB_LG_WIDTH = 1024;
const QUALITY = 0.78;

type Tier = { width: number; blob: Blob };

async function resizeTo(file: File, width: number): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    if (bitmap.width <= width) return null;

    const scale = width / bitmap.width;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob | null>((resolve) => {
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
  } catch {
    return null;
  } finally {
    bitmap.close?.();
  }
}

/**
 * Build the display-sized copies of an image, smallest first.
 *
 * Null entries are a normal outcome, not a failure: a HEIC the browser cannot
 * decode, an image already narrower than the target, or a browser without
 * canvas.toBlob. In every case the original is still uploaded and the
 * front-end falls back to the full-size file, so the worst outcome is a
 * slower page rather than a broken one.
 */
export async function makeThumbs(file: File): Promise<Tier[]> {
  /* Below the smallest target already. Upscaling would make it both larger
     and softer than the original, so there is nothing to gain. */
  if (file.size < 24 * 1024) return [];

  /* One decode for both sizes — createImageBitmap is the expensive part. */
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return [];
  }
  bitmap.close?.();

  const [small, large] = await Promise.all([
    resizeTo(file, THUMB_WIDTH),
    resizeTo(file, THUMB_LG_WIDTH)
  ]);

  const out: Tier[] = [];
  if (small) out.push({ width: THUMB_WIDTH, blob: small });
  if (large) out.push({ width: THUMB_LG_WIDTH, blob: large });
  return out;
}

/**
 * Read a Blob as base64, for a thumb column.
 *
 * Done with FileReader rather than a manual byte loop: the point of the
 * earlier CPU fix was to stop assembling megabyte strings byte by byte on
 * the server, and reintroducing that on the client would be the same mistake
 * in a place that cannot afford it either.
 */
export async function buildUploadForm(
  files: FileList | File[],
  folder: string,
  extra?: Record<string, string>
): Promise<FormData> {
  const list = Array.from(files);
  const form = new FormData();

  const tiers = await Promise.all(list.map((f) => makeThumbs(f)));

  list.forEach((f, i) => {
    form.append('file', f);
    tiers[i].forEach(({ width, blob }, n) => {
      form.append('thumb', blob, `thumb-${i}-${width}-${n}.webp`);
    });
  });

  form.append('folder', folder);
  Object.entries(extra || {}).forEach(([k, v]) => form.append(k, v));
  return form;
}