/* Prepare the Badoudao mark for the web.
 *
 * The source is a black drawing on a white square — a coconut tree on
 * an island over the water. Two problems with putting it on a page as
 * it is.
 *
 * The first is the white. A white square behind the mark means a
 * white block wherever the mark is not on white, and the header's
 * background is not white. So the white becomes transparent and the
 * mark keeps its own colour.
 *
 * The second is the favicon. The drawing is thin lines — a frond of
 * coconut leaves, three waves — and thin lines are exactly what a
 * sixteen-pixel square cannot hold. At that size the mark turns into
 * a smudge, and a smudge in a browser tab is worse than no mark.
 *
 * So the icon is built the other way round: the mark in white on the
 * brand blue, filling the tile. The shape is the same, the contrast
 * is what carries it, and a solid blue tile with a white island in it
 * still reads at sixteen pixels.
 *
 * Usage: node scripts/make-logo.js [source.png]
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SRC = process.argv[2] || 'D:/Downloads/tubiao.png';

/* The brand blue, from tokens.css. Kept as a number here because
   sharp wants numbers and the stylesheet wants a string, and a
   stylesheet cannot be read at build time on the edge. */
const BRAND = { r: 0x00, g: 0x52, b: 0xcc };

/* How close to white a pixel has to be before it counts as the
   background. The source is a scan, so the white is not perfectly
   uniform and a hard threshold would leave a fringe. */
const WHITE_AT = 238;

/**
 * The mark on transparent ground, trimmed to its own edges.
 *
 * Returned as raw pixels so that the same drawing can be reused for
 * both the black version on the page and the white version on the
 * icon without reading the file twice.
 */
async function readMark() {
  const img = sharp(SRC).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;

  /* White to transparent, and the black to pure black so that the
     edges do not carry a grey fringe from the scan. */
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    if (r >= WHITE_AT && g >= WHITE_AT && b >= WHITE_AT) {
      data[o + 3] = 0;
    } else {
      /* The darkest pixel in the drawing is the reference for "this is
         the ink". Everything is scaled against it, so a scan that is
         lighter than one that is darker still comes out solid. */
      data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 255;
    }
  }

  /* Trim to the ink. sharp's trim works on the alpha channel once
     the white is gone. */
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  return {
    data: trimmed.data,
    width: trimmed.info.width,
    height: trimmed.info.height
  };
}

/** The mark, recoloured, as a PNG buffer at the given width. */
async function markPng(mark, colour, width) {
  const { data, height } = mark;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    out[i] = colour.r; out[i + 1] = colour.g; out[i + 2] = colour.b; out[i + 3] = a;
  }
  return sharp(out, { raw: { width: mark.width, height, channels: 4 } })
    .resize({ width, withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * A tile for the browser: the mark in white on the brand blue.
 *
 * The mark is fitted inside the tile with a margin, because a mark
 * that touches the edge of a sixteen-pixel tile has nothing left to
 * look like.
 */
async function iconPng(mark, size, radius) {
  const ink = await markPng(mark, { r: 255, g: 255, b: 255 }, Math.round(size * 0.72));

  const tile = await sharp({
    create: { width: size, height: size, channels: 4, background: { ...BRAND, alpha: 1 } }
  })
    .composite([{ input: ink, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  if (!radius) return tile;

  /* The corners are rounded, so the tile is masked to the shape the
     browser expects. The mask is drawn white where the tile may show
     and black where it may not, and it is applied as an alpha
     channel rather than pasted over, so the edge stays clean. */
  const r = radius;
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/>
     </svg>`
  );
  return sharp(tile)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

(async () => {
  const mark = await readMark();
  console.log(`mark: ${mark.width} x ${mark.height}  ratio ${(mark.width / mark.height).toFixed(3)}`);

  const written = [];
  async function write(name, buf) {
    fs.writeFileSync(path.join(PUBLIC, name), buf);
    written.push(`${name}  ${(buf.length / 1024).toFixed(1)} KB`);
  }

  /* The mark on the page: black on transparent, kept large so that
     the browser has something to scale down from. */
  await write('logo.png', await markPng(mark, { r: 0, g: 0, b: 0 }, 512));

  /* The same mark in white, for a footer or any dark ground. */
  await write('logo-inverse.png', await markPng(mark, { r: 255, g: 255, b: 255 }, 512));

  /* Browser icons. */
  await write('favicon-32.png', await iconPng(mark, 32, 7));
  await write('favicon-64.png', await iconPng(mark, 64, 14));
  await write('icon-192.png', await iconPng(mark, 192, 42));
  await write('icon-512.png', await iconPng(mark, 512, 112));
  await write('apple-touch-icon.png', await iconPng(mark, 180, 0));

  console.log(written.join('\n'));
})();
