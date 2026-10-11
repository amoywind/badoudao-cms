/**
 * D1 access layer.
 *
 * Every API route runs on the edge runtime, so the DB handle comes from
 * getRequestContext() rather than a module-level import.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

/* Rows come back from D1 as loosely typed objects. Naming the two shapes the
   UI actually consumes lets `catch(() => [])` fallbacks infer correctly —
   without this, an empty fallback narrows the type to never[] and every
   property access below it fails the build. */
export type Category = {
  id: string;
  name: string;
  short: string;
  description?: string;
  designs?: string;
  price_range?: string;
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type ProductSpec = { label: string; value: string };
export type ProductOption = { label: string; priceDelta: number };
export type ProductPrice = { minQty: number; maxQty: number | null; unitPrice: number };
export type ProductImage = { url: string; alt?: string; isMain?: boolean };

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  priceMin: number;
  priceMax: number;
  moq: number;
  leadTime: string;
  moveLevel: string;
  difficulty: string;
  content: string;
  featured: boolean;
  status: string;
  sortOrder: number;
  /* Added in migration 0002 so the admin can override how a product
     appears in search results without touching code. */
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string;
  createdAt?: string;
  updatedAt?: string;
  specs: ProductSpec[];
  options: ProductOption[];
  prices: ProductPrice[];
  images: ProductImage[];
};

export type SiteSettings = Record<string, string>;

/* A product video is a YouTube id rather than a URL — the id survives a
   change of player and keeps the column narrow. */
export type ProductVideo = {
  id: number;
  productId: string;
  youtubeId: string;
  title: string;
  sortOrder: number;
};

/**
 * A navigation entry.
 *
 * Menus used to be hard-coded in SiteChrome.tsx, so reordering one item
 * meant editing and redeploying. These rows live in the `pages` table and
 * are read on every render, so the admin now owns both the header bar and
 * the footer columns.
 *
 * `placement` is either a real area ('top_nav', 'footer_1' … 'footer_5')
 * or 'content' for a standalone page that belongs to no menu. `href` is
 * resolved from `external_key` for fixed routes that have no pages row,
 * which keeps a single menu editable in one place.
 */
export type NavItem = {
  id: string;
  label: string;
  href: string;
  placement: string;
  navOrder: number;
};


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

export function mapProduct(row, extras: Record<string, unknown[]> = {}) {
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
    seoTitle: row.seo_title || '',
    seoDescription: row.seo_description || '',
    metaKeywords: row.meta_keywords || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    specs: (extras.specs as ProductSpec[]) || [],
    options: (extras.options as ProductOption[]) || [],
    prices: (extras.prices as ProductPrice[]) || [],
    images: (extras.images as ProductImage[]) || []
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

export async function listProducts(
  { category, status, featured, limit = 200 }: {
    category?: string;
    status?: string;
    featured?: number;
    limit?: number;
  } = {}
): Promise<Product[]> {
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

export async function listCategories(): Promise<Category[]> {
  const rows = await all('SELECT * FROM categories ORDER BY sort_order, name');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    short: r.short || '',
    description: r.description,
    designs: r.designs,
    price_range: r.price_range,
    status: r.status,
    seoTitle: r.seo_title || '',
    seoDescription: r.seo_description || ''
  }));
}

/**
 * Extract an 11-character YouTube id from any of the URL shapes a user is
 * likely to paste. Returns '' when the string is not recognisably YouTube,
 * so a bad paste is caught before it reaches the page.
 */
export function youtubeId(input: string): string {
  const s = String(input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;

  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return '';
}

export async function listProductVideos(productId: string): Promise<ProductVideo[]> {
  const rows = await all(
    'SELECT * FROM product_videos WHERE product_id = ? ORDER BY sort_order, id',
    productId
  );
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    youtubeId: r.youtube_id,
    title: r.title || '',
    sortOrder: r.sort_order ?? 0
  }));
}

/**
 * Menu entries for one area, ordered for display.
 *
 * Rows come from the `pages` table. `external_key` lets the menu point at a
 * fixed route that has no page row of its own (/products/, /articles/ …),
 * so a single call returns the whole menu. Anything flagged
 * show_in_nav = 0 is skipped rather than deleted — that is how a campaign
 * page is hidden without breaking a bookmarked link.
 */
export async function listNav(placement: string): Promise<NavItem[]> {
  const rows = await all(
    `SELECT id, title, nav_label, external_key, placement, nav_order, target
       FROM pages
      WHERE show_in_nav = 1 AND placement = ?
      ORDER BY nav_order, id`,
    placement
  );

  return rows
    .map((r) => {
      /* Four ways an entry can point somewhere, in priority order:
           external_key — a fixed route (/products, /articles …)
           id 'nav-home' — the site root, which no suffix can express
           target       — a sibling row's id (a footer entry mirroring a
                          content page, e.g. "Small Batch" → /p/small-batch)
           own id       — the row is itself the content page

           No trailing slash anywhere: Cloudflare Pages strips it before the
           request arrives, so a slashed link would be normalised into a
           redirect on every click. See the note in next.config.mjs. */
      const key = String(r.external_key || '').trim();
      const target = String(r.target || '').trim();
      return {
        id: r.id,
        label: String(r.nav_label || r.title || '').trim(),
        href: r.id === 'nav-home' ? '/'
          : key ? `/${key.replace(/^\/+|\/+$/g, '')}`
          : target ? `/p/${target}`
          : `/p/${r.id}`,
        placement: r.placement,
        navOrder: r.nav_order ?? 0
      };
    })
    .filter((n) => n.label);
}

/** key/value settings with defaults applied. */
export async function getSettings(): Promise<SiteSettings> {
  const rows = await all('SELECT key, value FROM settings');
  const map: SiteSettings = {};
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

/** Canonical host. Overridable so a custom domain needs no code change. */
export const SITE_URL = 'https://badoudao-site.pages.dev';

/**
 * Build a Next.js metadata object for a public page.
 *
 * Every page used to inherit one shared title, which told Google that eight
 * different URLs were the same page. Each route now supplies its own, with
 * the admin's override winning when set — an editor should be able to fix
 * a title without touching code.
 *
 * `trim` guards the two failure modes that waste a rewrite: a title over
 * ~60 characters is cut off in results, and a description over ~160 is
 * dropped entirely.
 */
export function buildMeta({
  title,
  description,
  seoTitle,
  seoDescription,
  path = '',
  image,
  type = 'website',
  keywords
}: {
  title: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  path?: string;
  image?: string;
  type?: string;
  keywords?: string;
}) {
  const t = String(seoTitle || title || '').trim().slice(0, 62);
  const d = String(seoDescription || description || '').trim().slice(0, 158);
  const site = SITE_URL.replace(/\/+$/, '');
  const url = path ? `${site}${path.startsWith('/') ? path : `/${path}`}` : site;

  return {
    title: t,
    description: d,
    alternates: { canonical: path || '/' },
    keywords: keywords || undefined,
    openGraph: {
      title: t,
      description: d,
      url,
      type,
      siteName: 'Badoudao',
      images: image ? [{ url: image.startsWith('http') ? image : `${site}${image}` }] : undefined
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: t,
      description: d
    }
  };
}

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