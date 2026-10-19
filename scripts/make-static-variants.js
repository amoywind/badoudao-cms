/**
 * Generate the smaller copies of the two full-bleed photos in public/.
 *
 * These are not in the media library — they are checked-in files, which is
 * why the thumbnail work does not touch them. But they have the same
 * problem the library had: workshop-floor.jpg is 1400x933 and 206 KB, and
 * it renders into a 358px frame on a phone. After the library thumbnails
 * were added it was the single heaviest item left on the home page.
 *
 * A wide photo at 358 CSS px needs about 716 device px on a 2x screen, so
 * two variants rather than one: 720 for phones and small laptops, 1400 for
 * the desktop layout where it spans half the viewport.
 *
 * The originals are left in place. srcset picks between them, and the file
 * that is currently live is what a desktop visitor still gets.
 *
 * Usage: node scripts/make-static-variants.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC = path.join(__dirname, '..', 'public');

/* 76 rather than 78: a workshop floor is a high-frequency photograph —
   machinery, grating, benches — and JPEG's artefacts show on that texture
   sooner than they do on a clock photographed against a white wall. */
const QUALITY = 76;

const JOBS = [
  { src: 'hero-clocks.jpg', widths: [720] },
  { src: 'workshop-floor.jpg', widths: [720] }
];

async function main() {
  console.log('');
  for (const job of JOBS) {
    const from = path.join(PUBLIC, job.src);
    if (!fs.existsSync(from)) {
      console.log(`  ! ${job.src} 不存在，跳过`);
      continue;
    }
    const originalSize = fs.statSync(from).size;
    const meta = await sharp(from).metadata();

    for (const width of job.widths) {
      if ((meta.width || 0) <= width) {
        console.log(`  · ${job.src} 已是 ${meta.width}px 宽，不需要 ${width}px 变体`);
        continue;
      }
      const out = path.join(PUBLIC, job.src.replace(/\.jpg$/i, `-${width}.jpg`));
      await sharp(from)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(out);

      const newSize = fs.statSync(out).size;
      console.log(
        `  ✓ ${job.src} → ${path.basename(out)}\n` +
        `      ${Math.round(originalSize / 1024)} KB → ${Math.round(newSize / 1024)} KB` +
        ` (${meta.width}px → ${width}px)`
      );
    }
  }
  console.log('\n  在 <img> 上加 srcset="/xxx-720.jpg 720w, /xxx.jpg 1400w"。\n');
}

main().catch((e) => { console.error('\n错误：', e.message, '\n'); process.exit(1); });