/**
 * Generate 640px WebP thumbnails for images already in the library.
 *
 * The upload route cannot do this itself: sharp is a native module and the
 * route runs on the Workers edge runtime, which has no native addons. New
 * uploads therefore generate their thumbnail in the browser before the file
 * is sent (see clientThumb in the admin upload paths), and this script covers
 * the images that predate that — 23 of them, 9.26 MB of originals.
 *
 * Reads the base64 straight out of D1, so no file needs to exist on this
 * machine. Idempotent: a row that already has a thumb is skipped unless
 * --force is passed.
 *
 * Usage:
 *   node scripts/backfill-thumbs.js [--force] [--id img_xxx] [--dry]
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const DEV_VARS = path.join(ROOT, '.dev.vars');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const DB_ID = process.env.CF_DATABASE_ID || 'aba203a7-d49a-4c93-b4f9-aa931aa219c7';

const WIDTH = 640;
/* 78 rather than 80. Product photos are flat colour and hard edges on a
   white background, which is where JPEG's ringing is most visible — the
   clock's rim against the backdrop. The 2 KB a photo saves across 23 images
   is worth the difference nobody can see. */
const QUALITY = 78;

function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const raw = fs.readFileSync(DEV_VARS, 'utf8');
  const m = raw.match(/^CLOUDFLARE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error('CLOUDFLARE_API_TOKEN not found in .dev.vars');
  return m[1].trim();
}

async function sql(statement, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${readToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: statement, params })
    }
  );
  const json = await res.json();
  if (!json.success) {
    throw new Error((json.errors || []).map((e) => e.message).join('; '));
  }
  return json.result && json.result[0] && json.result[0].results;
}

async function main() {
  const force = process.argv.includes('--force');
  const dry = process.argv.includes('--dry');
  const idArg = process.argv.find((a) => a.startsWith('--id='));
  const only = idArg ? idArg.slice(5) : null;

  const where = [];
  const params = [];
  if (!force) where.push('thumb IS NULL');
  if (only) { where.push('id = ?'); params.push(only); }

  const rows = await sql(
    `SELECT id, filename, width, height, size, mime, data
       FROM media
      WHERE data IS NOT NULL ${where.length ? 'AND ' + where.join(' AND ') : ''}
      ORDER BY size DESC`,
    params
  );

  if (!rows.length) {
    console.log('\n没有需要处理的图片（已全部有缩略图，或 --id 没匹配到）。\n');
    return;
  }

  console.log(`\nbackfill-thumbs — ${rows.length} 张待处理\n`);
  let ok = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const row of rows) {
    const label = `${row.filename} (${row.width}×${row.height})`;
    try {
      const buf = Buffer.from(row.data, 'base64');

      const meta = await sharp(buf).metadata();
      /* Already narrower than the target: a thumbnail would be an upscale, so
         it would be softer than the original and larger than it. Store the
         original instead — a card showing a 480px image is already small. */
      const resized = (meta.width || 0) > WIDTH;
      const out = await sharp(buf)
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      const saved = row.size - out.length;
      if (savedBytes > 0) savedBytes += saved;

      console.log(
        `  ${resized ? '✓' : '·'} ${label}\n` +
        `      ${Math.round(row.size / 1024)} KB → ${Math.round(out.length / 1024)} KB` +
        ` (${resized ? 'resize' : '原图已够小，不放大'})` +
        `  省 ${Math.max(0, Math.round(saved / 1024))} KB`
      );

      if (!dry) {
        await sql('UPDATE media SET thumb = ? WHERE id = ?', [out.toString('base64'), row.id]);
      }
      ok++;
    } catch (err) {
      console.log(`  ✗ ${label}\n      ${err.message}`);
      failed++;
    }
  }

  console.log(`\n成功 ${ok}，失败 ${failed}`);
  if (!dry) {
    console.log(`每张页面少传约 ${Math.round(savedBytes / rows.length / 1024)} KB（均值）`);
    console.log('缩略图已写入 media.thumb；/api/media-thumb/[id] 会自动开始服务。');
  }
  console.log('');
}

main().catch((e) => { console.error('\n错误：', e.message, '\n'); process.exit(1); });