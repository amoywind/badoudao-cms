/**
 * D1 access layer.
 *
 * Every API route runs on the edge runtime, so the DB handle comes from
 * getRequestContext() rather than a module-level import.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDB() {
  const { env } = getRequestContext();
  if (!env?.DB) {
    throw new Error('D1 binding "DB" is not configured. Add it in Cloudflare Pages → Settings → Functions.');
  }
  return env.DB;
}

/** Run a query, return the first row or null. */
export async function one(sql, ...params) {
  const db = getDB();
  return db.prepare(sql).bind(...params).first();
}

/** Run a query, return all rows. */
export async function all(sql, ...params) {
  const db = getDB();
  const { results } = await db.prepare(sql).bind(...params).all();
  return results || [];
}

/** Run a write. */
export async function run(sql, ...params) {
  const db = getDB();
  return db.prepare(sql).bind(...params).run();
}

/** Run several writes in one transaction. */
export async function batch(statements) {
  const db = getDB();
  return db.batch(statements);
}

/* ------------------------------------------------------------------ */
/* row → object mappers                                                */
/* ------------------------------------------------------------------ */

export function mapProduct(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    summary: row.summary || '',
    priceMin: row.price_min ?? 0,
    priceMax: row.price_max ?? 0,
    moq: row.moq ?? 500,
    leadTime: row.lead_time || '',
    moveLevel: row.move_level || '',
    difficulty: row.difficulty || 'simple',
    content: row.content || '',
    featured: row.featured === 1,
    status: row.status || 'published',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    specs: extras.specs || [],
    options: extras.options || [],
    prices: extras.prices || [],
    images: extras.images || []
  };
}

/** Load a product with its related rows. */
export async function getProduct(idOrSlug, { includeDrafts = true } = {}) {
  const row = await one(
    `SELECT * FROM products
     WHERE (id = ? OR slug = ?)
       ${includeDrafts ? '' : "AND status = 'published'"}`,
    idOrSlug,
    idOrSlug
  );
  if (!row) return null;

  const [specs, options, prices, images] = await Promise.all([
    all(
      'SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order, id',
      row.id
    ),
    all(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order, id',
      row.id
    ),
    all(
      'SELECT * FROM product_prices WHERE product_id = ? ORDER BY min_qty',
      row.id
    ),
    all(
      `SELECT m.*, pi.sort_order AS image_order, pi.is_main
       FROM product_images pi
       JOIN media m ON m.id = pi.media_id
       WHERE pi.product_id = ?
       ORDER BY pi.is_main DESC, pi.sort_order`,
      row.id
    )
  ]);

  return mapProduct(row, {
    specs: specs.map((s) => ({ id: s.id, label: s.label, value: s.value })),
    options: options.map((o) => ({
      id: o.id,
      label: o.label,
      priceDelta: o.price_delta ?? 0
    })),
    prices: prices.map((p) => ({
      id: p.id,
      minQty: p.min_qty,
      maxQty: p.max_qty,
      unitPrice: p.unit_price
    })),
    images: images.map((m) => ({
      id: m.id,
      url: m.url,
      alt: m.alt || '',
      filename: m.filename,
      isMain: m.is_main === 1
    }))
  });
}

export async function listProducts({ category, status, featured, limit = 200 } = {}) {
  const where = [];
  const params = [];

  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (featured !== undefined) {
    where.push('featured = ?');
    params.push(featured ? 1 : 0);
  }

  const sql = `SELECT * FROM products
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY sort_order, name
    LIMIT ?`;
  params.push(limit);

  const rows = await all(sql, ...params);

  /* attach main image without N+1 queries */
  const withImages = await Promise.all(
    rows.map(async (row) => {
      const img = await one(
        `SELECT m.id, m.url, m.alt FROM product_images pi
         JOIN media m ON m.id = pi.media_id
         WHERE pi.product_id = ? ORDER BY pi.is_main DESC, pi.sort_order LIMIT 1`,
        row.id
      );
      return mapProduct(row, {
        images: img ? [{ id: img.id, url: img.url, alt: img.alt || '', isMain: true }] : []
      });
    })
  );

  return withImages;
}

export async function listCategories() {
  return all('SELECT * FROM categories ORDER BY sort_order, name');
}

/** key/value settings with defaults applied. */
export async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  return map;
}

export async function setSetting(key, value) {
  await run(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    key,
    String(value ?? '')
  );
}

/* ------------------------------------------------------------------ */
/* audit                                                               */
/* ------------------------------------------------------------------ */

export async function log(userId, action, entity, entityId, summary) {
  try {
    await run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, summary)
       VALUES (?, ?, ?, ?, ?)`,
      userId || '',
      action,
      entity,
      entityId || '',
      summary || ''
    );
  } catch {
    /* logging must never break the operation */
  }
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/["'']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function uid(prefix = '') {
  const s = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${s}` : s;
}

export const nowISO = () => new Date().toISOString().slice(0, 19).replace('T', ' ');