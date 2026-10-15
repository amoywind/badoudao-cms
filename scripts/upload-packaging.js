/**
 * Upload the packaging photographs into the media table.
 *
 *   node scripts/upload-packaging.js
 *
 * Writes D1 directly rather than posting to /api/media. That route checks a
 * session cookie via currentUser(), and this script has no session — it has
 * the account token. Going around it means reproducing three things the
 * route does: the id format, the url, and the R2-or-D1 decision. R2 is not
 * bound on this account, so everything lands in D1 under /api/media-file/,
 * which is what the route would have chosen anyway. If R2 is ever enabled,
 * re-upload through the admin instead: this script does not check for the
 * bucket and will keep using the per-row `data` column.
 *
 * Sharp, not Pillow: sharp is already a dependency and needs no venv.
 *
 * Resized to 1200px on the long edge at quality 82. The sources are
 * 490–670 KB and a packaging card renders at about a third of a desktop
 * column, so the extra detail is not visible — but four unoptimised JPEGs
 * on a product page is 2.3 MB that a European buyer pays for on every
 * visit.
 *
 * Idempotent. A row already carrying the same filename is left alone, so
 * re-running does not accumulate near-duplicates nobody can tell apart.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const FOLDER = 'packaging';
const LONG_EDGE = 1200;
const QUALITY = 82;

const SOURCES = [
  { file: '包装盒01_牛皮纸闭口盒_白底.jpg', alt: 'Kraft paper closed box with a printed label' },
  { file: '包装盒02_飞机盒+保丽龙内托_白底.jpg', alt: 'Mail-order box with an EPS foam insert holding the clock' },
  { file: '包装盒04_开口盒_装钟展示.jpg', alt: 'Open display box, clock visible without unpacking' },
  { file: '包装盒05_闭口盒彩盒_巴豆岛定制.jpg', alt: 'Custom printed colour box with the Badoudao logo' }
];

const SRC_DIR = 'D:/AI/PP磨砂板挂钟_包装盒';
const CF = {
  account: '086d893ed76ae09ae6abac33113d7eab',
  db: 'aba203a7-d49a-4c93-b4f9-aa931aa219c7'
};

const TOKEN = (() => {
  const v = fs.readFileSync(path.join(__dirname, '..', '.dev.vars'), 'utf8');
  const m = v.match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m);
  if (!m) throw new Error('.dev.vars 里没有 API_TOKEN');
  return m[1].trim();
})();

async function query(sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF.account}/d1/database/${CF.db}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    }
  );
  const body = await res.json();
  if (!body.success) throw new Error(JSON.stringify(body.errors).slice(0, 300));
  return body.result?.[0]?.results ?? [];
}

/* The route builds the id this way: img_ followed by 24 hex characters.
   Same format keeps these indistinguishable from uploaded files in the
   admin's media library. */
function newId() {
  return 'img_' + crypto.randomBytes(12).toString('hex');
}

(async () => {
  console.log(`包装图上传 → folder=${FOLDER}\n`);

  const existing = await query('SELECT filename FROM media WHERE folder = ?', [FOLDER]);
  const already = new Set(existing.map((r) => r.filename));

  for (const s of SOURCES) {
    const full = path.join(SRC_DIR, s.file);

    if (!fs.existsSync(full)) {
      console.log(`  跳过   ${s.file} — 源文件不存在`);
      continue;
    }
    if (already.has(s.file)) {
      console.log(`  跳过   ${s.file} — 已存在`);
      continue;
    }

    const raw = fs.readFileSync(full);
    const before = raw.length;

    const { data, info } = await sharp(raw)
      .rotate()                         // honour the EXIF orientation; a
                                       // sideways packaging photo reads as a
                                       // broken image, not as a rotated one
      .resize({
        width: LONG_EDGE,
        height: LONG_EDGE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    console.log(
      `  ${s.file}\n` +
      `         ${(before / 1024).toFixed(0)} KB → ${(data.length / 1024).toFixed(0)} KB  ${info.width}×${info.height}`
    );

    const id = newId();
    /* Base64 in the JSON body: D1's REST query endpoint takes JSON, and the
       alternative — a multi-hundred-KB hex literal — would exceed the
       request size on the larger files. */
    await query(
      `INSERT INTO media (id, filename, url, mime, size, width, height, alt, folder, tag, data)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        s.file,
        `/api/media-file/${id}`,
        'image/jpeg',
        data.length,
        info.width,
        info.height,
        s.alt,
        FOLDER,
        'packaging',
        data.toString('base64')
      ]
    );

    console.log(`         已入库  ${id}\n`);
  }

  const rows = await query(
    'SELECT id, filename, alt, width, height, size FROM media WHERE folder = ? ORDER BY filename',
    [FOLDER]
  );
  console.log(`完成，${rows.length} 张：`);
  rows.forEach((r) =>
    console.log(`  ${r.id}  ${r.filename}  ${r.width}×${r.height}  ${(r.size / 1024).toFixed(0)} KB`)
  );
})().catch((e) => {
  console.error('失败:', e.message);
  process.exit(1);
});