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
  /* The newest product's main image, used as the category card's picture.
     Absent when no product in the category has an image yet. */
  imageUrl?: string;
  productCount?: number;
};

export type ProductSpec = { id?: string | number; label: string; value: string };
export type ProductOption = { label: string; priceDelta: number };
export type ProductPrice = { minQty: number; maxQty: number | null; unitPrice: number };
export type ProductImage = {
  url: string;
  /* 640px copy of the same photo, when one has been generated. Null on
     images uploaded before thumbnails existed — every caller falls back to
     `url`. */
  thumbUrl?: string | null;
  /* 1024px tier, for the product gallery's srcset. */
  thumbLgUrl?: string | null;
  alt?: string;
  isMain?: boolean;
  kind?: string;
};

/* Which customisation values the owner ticked for this model. The group
   keys and the values themselves live in product-detail.ts; this is only
   the per-product selection. */
export type ProductCustomisation = {
  groupKey: string;
  value: string;
  priceDelta: number;
};

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
  /* The carton the product ships in, used by the freight estimator on
     the detail page. Every field is optional because the factory has
     not recorded carton data for every model yet, and the estimator
     falls back to a stated assumption when one is missing.

     Rebuilt field by field in mapProduct below — a field added here
     and not there is a field that arrives as undefined. */
  cartonQty?: number | null;
  cartonL?: number | null;
  cartonW?: number | null;
  cartonH?: number | null;
  cartonGw?: number | null;
  /* The two filterable attributes from §5.3-1. Both nullable, because
     a value that would have to be guessed is left unset. */
  movementType?: string | null;
  sizeInch?: number | null;
  /* Only the detail page loads these. Optional so the list query, which
     does not join the table, still satisfies the type — and the page reads
     it as `product.customisations || []` for the same reason. */
  customisations?: ProductCustomisation[];
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

/**
 * Memoise a read — within the request, then across requests at the edge.
 *
 * Two layers, because they answer different questions.
 *
 * The in-memory map (globalThis, so it lives for the isolate) collapses
 * repeated reads inside one render: the categories are needed by the header,
 * the footer, the sidebar and the page body, and they used to be four
 * identical round trips to D1. Storing the Promise rather than the value
 * means two callers awaiting the same miss still cause one query.
 *
 * The Cache API layer sits behind it and outlives the request. Every public
 * page re-reads the same handful of rows, none of which differ between two
 * visitors, and each read is a network round trip — measured at roughly
 * 1.5s for the three queries `listCategories` needs. Caching the result
 * rather than the rendered HTML removes that cost without touching the
 * response body, which middleware cannot do (see src/middleware.ts for why
 * the caching lives here instead of there).
 *
 * Two properties worth stating plainly:
 *
 *   - `cached()` never parallelises. It dedupes and it remembers; it does
 *     not make independent queries concurrent. `listCategories` issues its
 *     three inside a Promise.all for that reason.
 *
 *   - Every write path calls `invalidateCache()`, which clears the map and
 *     drops the edge entries, so an edit is visible on the next request.
 *     `batch()` counts as a write and did not used to invalidate — harmless
 *     while the map lived for one request, not harmless now.
 */

/** How long a cached read is served from the edge, in seconds. */
const READ_TTL_SECONDS = 300;

const CACHE = '__badoudao_read_cache__';

type CacheBucket = Map<string, Promise<unknown>>;

function cache(): CacheBucket {
  const g = globalThis as unknown as Record<string, CacheBucket | undefined>;
  if (!g[CACHE]) g[CACHE] = new Map();
  return g[CACHE] as CacheBucket;
}

function readKey(sql: string, params: unknown[]) {
  return `${sql}|${JSON.stringify(params)}`;
}

/** Cache API keys must be URLs, so the query is hashed into one. */
async function edgeKey(sql: string, params: unknown[]): Promise<string | null> {
  const data = new TextEncoder().encode(readKey(sql, params));
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  /* Keyed to the request host so two deployments on different domains do
     not read each other's entries in a shared data centre. */
  const host = (() => {
    try {
      return new URL((getRequestContext() as { request?: Request }).request?.url || 'https://local')
        .host;
    } catch {
      return 'local';
    }
  })();
  return `https://${host}/__bd-read/${hex}`;
}

/**
 * The Cache API is unavailable in local dev and would silently swallow
 * every error otherwise, so its absence is a normal state, not a fault.
 */
function edgeCache(): Cache | null {
  const g = globalThis as unknown as { caches?: CacheStorage };
  return g.caches?.default ?? null;
}

/** Run a query once, then reuse the result for the request and the edge. */
export async function cached<T = Record<string, unknown>[]>(
  sql: string,
  ...params: unknown[]
): Promise<T> {
  const key = readKey(sql, params);
  const bucket = cache();

  const hit = bucket.get(key);
  if (hit) return hit as T;

  /* Promise, not value: two callers awaiting the same miss must not both
     reach the database. */
  const p = (async () => {
    const edge = edgeCache();
    const ekey = edge ? await edgeKey(sql, params) : null;

    if (edge && ekey) {
      try {
        const stored = await edge.match(ekey);
        if (stored) return (await stored.json()) as T;
      } catch {
        /* A cache miss must never be fatal — fall through to D1. */
      }
    }

    const rows = (await all(sql, ...params)) as T;

    if (edge && ekey) {
      try {
        await edge.put(
          ekey,
          new Response(JSON.stringify(rows), {
            headers: {
              'Content-Type': 'application/json',
              /* Cache API reads the TTL from Cache-Control; max-age here is
                 what expires the entry, s-maxage would not. */
              'Cache-Control': `public, max-age=${READ_TTL_SECONDS}`
            }
          })
        );
        /* Remember the key so invalidateCache() can delete it — the Cache
           API offers no way to enumerate what it holds. */
        const g = globalThis as unknown as { __bd_edge_keys__?: Set<string> };
        if (!g.__bd_edge_keys__) g.__bd_edge_keys__ = new Set();
        g.__bd_edge_keys__.add(ekey);
      } catch {
        /* Storage refused — the value is still correct, just not cached. */
      }
    }

    return rows;
  })();

  bucket.set(key, p);
  return p;
}

/**
 * Drop memoised reads — call after anything that writes.
 *
 * Clears the in-memory map synchronously, and deletes from the edge every
 * key this isolate has read so far. That second part is why the keys are
 * tracked: Cache API has no wildcard delete and no listing API, so the only
 * way to clear more than one entry is to know the keys.
 *
 * Tracking is per-isolate, so a write clears the keys its own instance read.
 * An entry some other instance wrote stays until its TTL — at most
 * READ_TTL_SECONDS. In practice the isolate that serves a request is the one
 * that did the reading, and the admin write and the next page view usually
 * land on the same one, so the common path is immediate.
 *
 * Deliberately not awaited. A write must not wait on the network to
 * return, and the worst case of dropping out is the TTL the entry had
 * anyway.
 */
export function invalidateCache() {
  cache().clear();

  const edge = edgeCache();
  if (!edge) return;

  const keys = [...(globalThis as unknown as { __bd_edge_keys__?: Set<string> }).__bd_edge_keys__ ?? []];
  (globalThis as unknown as { __bd_edge_keys__?: Set<string> }).__bd_edge_keys__ = new Set();

  void Promise.all(
    keys.map((k) =>
      edge.delete(k).catch(() => {
        /* already gone, or refused — the TTL covers it */
      })
    )
  );
}

/** Run a write. */
export async function run(sql, ...params) {
  const db = getDB();
  const r = await db.prepare(sql).bind(...params).run();
  invalidateCache();
  return r;
}

/**
 * Run several writes in one transaction.
 *
 * Invalidates like `run()` does. It did not used to, which was invisible
 * while the read cache lived for a single request — the next request always
 * built a fresh map — and would have served the previous contents for the
 * full TTL now that entries survive across requests. Both product create and
 * product update come through here.
 */
export async function batch(statements) {
  const db = getDB();
  const r = await db.batch(statements);
  invalidateCache();
  return r;
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
    moq: row.moq ?? 300,
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
    images: (extras.images as ProductImage[]) || [],
    cartonQty: row.carton_qty ?? null,
    cartonL: row.carton_l ?? null,
    cartonW: row.carton_w ?? null,
    cartonH: row.carton_h ?? null,
    cartonGw: row.carton_gw ?? null,
    movementType: row.movement_type || null,
    sizeInch: row.size_inch ?? null,
    /* Empty rather than omitted when the caller did not load them: the
       detail page reads product.customisations.length directly, and an
       undefined here is the same class of bug as the missing fifth
       Promise.all entry — the field has to always exist. */
    customisations: (extras.customisations as ProductCustomisation[]) || []
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

  const [specs, options, prices, images, customs] = await Promise.all([
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
    /* Named columns, not m.*. The media table carries the file's base64 in
       `data`, which this query never needs — it only wants the metadata and
       the product_images flags. Reading it meant pulling a megabyte of
       binary per product off D1 and throwing it away on a page every buyer
       loads. */
    all(
      `SELECT m.id, m.url, m.alt, m.filename, m.thumb, m.thumb_lg,
              pi.sort_order AS image_order, pi.is_main, pi.kind AS shot_kind
       FROM product_images pi
       JOIN media m ON m.id = pi.media_id
       WHERE pi.product_id = ?
       ORDER BY pi.is_main DESC, pi.sort_order`,
      row.id
    ),
    /* The owner's per-product customisation picks. This has to be the fifth
       entry: the destructuring above reads five names off this array, and a
       short array leaves customs undefined — which surfaced as a 404,
       because the page calls getProduct inside a .catch(() => null) and
       reports a thrown error as a missing product. */
    all(
      'SELECT group_key, value, price_delta FROM product_customisations WHERE product_id = ? ORDER BY group_key, sort_order',
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
      /* mediaId is the file's id in the media table — product_images.id is
         a different number, and the admin's save path needs the file's id.
         Both are returned so an image can be sent back unchanged. */
      mediaId: m.media_id,
      id: m.id,
      url: m.url,
      /* The display-sized copy, when one has been generated. Cards, grids and
         galleries render this; `url` stays the full-resolution original for
         the detail view and for anyone who asks to see it large. Null on
         images uploaded before thumbnails existed, and the callers fall back
         to `url`. */
      thumbUrl: m.thumb ? `/api/media-thumb/${m.id}` : null,
      /* The 1024px tier. The product gallery is the one place that needs
         more than the 640px copy — see _pd-client's srcset. */
      thumbLgUrl: m.thumb_lg ? `/api/media-thumb/${m.id}?w=1024` : null,
      alt: m.alt || '',
      filename: m.filename,
      isMain: m.is_main === 1,
      /* Which angle this shot is: front, back, movement, packaging, detail.
         Null on older rows, which the gallery treats as the front view. */
      kind: m.shot_kind || ''
    })),
    /* Which customisation values apply to this model. The groups live in
       product-detail.ts; this records the owner's per-product picks. */
    customisations: customs.map((c) => ({
      groupKey: c.group_key,
      value: c.value,
      priceDelta: c.price_delta || 0
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

  const rows = await cached<any[]>(sql, ...params);

  /* Main image per product, in one query.

     This was a query per row inside a Promise.all — technically concurrent,
     so the wall-clock looked acceptable while still costing one D1 round
     trip each. On a category page with 40 products that is 41 queries for
     data that has one obvious join. The window function picks the same row
     per product (is_main first, then sort order) in a single pass. */
  const mainByProduct: Record<string, { id: string; url: string; alt: string; thumbUrl: string | null }> = {};

  if (rows.length) {
    const imgs = await cached<any[]>(
      `SELECT pi.product_id, m.id, m.url, m.alt, m.thumb,
              ROW_NUMBER() OVER (
                PARTITION BY pi.product_id
                ORDER BY pi.is_main DESC, pi.sort_order, pi.id
              ) AS rn
         FROM product_images pi
         JOIN media m ON m.id = pi.media_id
        WHERE pi.product_id IN (${rows.map(() => '?').join(',')})`,
      ...rows.map((r) => r.id)
    );

    imgs.forEach((i) => {
      if (i.rn === 1) {
        mainByProduct[i.product_id] = {
          id: i.id, url: i.url, alt: i.alt || '',
          thumbUrl: i.thumb ? `/api/media-thumb/${i.id}` : null
        };
      }
    });
  }

  return rows.map((row) => {
    const img = mainByProduct[row.id];
    return mapProduct(row, {
      images: img
        ? [{ id: img.id, url: img.url, thumbUrl: img.thumbUrl, alt: img.alt, isMain: true }]
        : []
    });
  });
}

export async function listCategories(): Promise<Category[]> {
  /* Three independent reads, one round trip.

     These were three sequential awaits, which cost two extra network
     round trips to D1 on every render of every public page — measured at
     ~1.5s total for the set. Nothing here depends on anything above it:
     the cover rows are keyed by category id afterwards, not read from
     `rows`. So they go out together.

     `cached()` does not help here. It dedupes repeated reads inside a
     single request; it never parallelises anything. */
  const [rows, covers, counts] = await Promise.all([
    cached<any[]>('SELECT * FROM categories ORDER BY sort_order, name'),
    cached<any[]>(
      `SELECT category, url, thumb, media_id FROM (
         SELECT p.category AS category, m.url AS url, m.thumb AS thumb,
                m.id AS media_id,
                ROW_NUMBER() OVER (
                  PARTITION BY p.category
                  ORDER BY p.updated_at DESC, p.id DESC
                ) AS rn
           FROM products p
           JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = 1
           JOIN media m ON m.id = pi.media_id
          WHERE p.status = 'published'
       ) WHERE rn = 1`
    ),
    cached<any[]>(
      `SELECT category, COUNT(*) AS n FROM products WHERE status = 'published' GROUP BY category`
    )
  ]);

  /* Cover image per category: the newest published product that actually has
     a main image.

     Newest, because that is the product being promoted — a category whose
     picture is three years old shows a model the factory has moved on from.
     "Actually has one", because a category whose newest product has no photo
     but an older one does should still show something.

     Row_number partitioned by category rather than a join on max(): the
     join picks one product and returns nothing at all when that product has
     no image, and a category card with no picture is the thing this is
     meant to fix. First row per category wins — the query is already
     ordered so the newest comes first within each partition. */
  const coverByCat = new Map<string, { url: string; thumbUrl: string | null }>();
  for (const row of covers) {
    if (!coverByCat.has(row.category)) {
      coverByCat.set(row.category, {
        url: row.url,
        thumbUrl: row.thumb ? `/api/media-thumb/${row.media_id}` : null
      });
    }
  }

  const countByCat = new Map(counts.map((r) => [r.category, r.n]));

  return rows.map((r) => {
    const cover = coverByCat.get(r.id);
    return {
      id: r.id,
      name: r.name,
      short: r.short || '',
      description: r.description,
      designs: r.designs,
      price_range: r.price_range,
      status: r.status,
      seoTitle: r.seo_title || '',
      seoDescription: r.seo_description || '',
      imageUrl: cover?.url || '',
      /* Display-sized copy for the card. Null on images uploaded before
         thumbnails existed — the caller falls back to imageUrl. */
      imageThumbUrl: cover?.thumbUrl || null,
      productCount: countByCat.get(r.id) || 0
    };
  });
}

/**
 * Published product count per category, keyed by category id.
 *
 * For the category sidebar: "Metal Clocks (14)" tells a buyer whether a
 * branch is worth opening, and a category showing 0 says so instead of
 * inviting a click that leads to an empty grid.
 *
 * One grouped query rather than a COUNT per category — eight round trips
 * on every product page render is not worth a number that could be a
 * single row.
 */
export async function countProductsByCategory(): Promise<Record<string, number>> {
  const rows = await cached<any[]>(
    `SELECT category, COUNT(*) AS n
       FROM products
      WHERE status = 'published' AND category IS NOT NULL AND category <> ''
      GROUP BY category`
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.category] = Number(r.n) || 0;
  return out;
}

/**
 * Extract an 11-character YouTube id from any of the URL shapes a user is
 * likely to paste. Returns '' when the string is not recognisably YouTube,
 * so a bad paste is caught before it reaches the page.
 */
export function youtubeId(input: string): string {
  const s = String(input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;

  /* An embed code. YouTube's share dialog offers both a link and an
     <iframe> snippet, and an admin who copies from the "Embed" tab
     pastes the snippet rather than the link. The snippet is searched
     for its src attribute, which is where the id lives — so the same
     patterns below apply to it.

     The iframe is not rendered as given. Only the id is kept, and the
     player is built from it, so a pasted snippet cannot smuggle in
     another origin, a script, or a tracking parameter. */
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube-nocookie\.com\/embed\/([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return '';
}

/**
 * The site-level video slots.
 *
 * The product videos table holds a video per product. These hold the
 * videos that belong to the site rather than to a product: the factory
 * footage on the home page, the four process clips on the quality page,
 * the drop test on a product page.
 *
 * The slot is a fixed key rather than a row id, because the page has to
 * know which slot it is filling. A row per slot means an id that cannot
 * be deleted without leaving a hole in the layout, and a title that
 * cannot change.
 */
export type SiteVideoSlot = {
  slot: string;
  youtubeId: string;
  title: string;
  sortOrder: number;
};

/** The slots the front end looks for. */
export const VIDEO_SLOTS = {
  'home-factory-1': 'Home — factory floor, CNC cutting',
  'home-factory-2': 'Home — assembly bench',
  'home-factory-3': 'Home — packing line',
  'home-factory-4': 'Home — loading into the container',
  'qc-step-1': 'QC Step 1 — raw material check',
  'qc-step-2': 'QC Step 2 — 24-hour movement aging',
  'qc-step-3': 'QC Step 3 — hand balancing',
  'qc-step-4': 'QC Step 4 — drop test',
  'pdp-drop-test': 'Product page — the drop test'
} as const;

export async function listSiteVideos(): Promise<SiteVideoSlot[]> {
  /* Not cached, unlike the other reads on these pages.
     The table holds nine rows and the query is a single indexed scan,
     so the saving from caching it is a fraction of a millisecond. The
     cost of caching it is real: a write that goes around the admin —
     a migration, a direct edit in the D1 console, a fix applied by
     hand after a mistake — leaves the old video on the page for the
     length of the TTL, with nothing on screen to say why.

     That was not hypothetical. A video written straight to the database
     during testing stayed invisible for five minutes after it was
     committed, and the only symptom was a slot that said "Video
     pending" beside a video that was plainly there.

     The reads that carry real weight — the catalogue, the settings,
     the navigation — stay cached. This one is cheap enough not to
     need it. */
  const rows = await all(
    'SELECT slot, youtube_id, title, sort_order FROM site_videos ORDER BY sort_order, slot'
  );
  return rows.map((r) => ({
    slot: String(r.slot),
    youtubeId: String(r.youtube_id || ''),
    title: String(r.title || ''),
    sortOrder: Number(r.sort_order ?? 0)
  }));
}

/**
 * The site videos, keyed by slot.
 *
 * A map rather than a list, because the caller asks for one slot at a
 * time and a missing slot has to return nothing rather than throw.
 */
export async function siteVideoMap(): Promise<Record<string, SiteVideoSlot>> {
  const rows = await listSiteVideos();
  const out: Record<string, SiteVideoSlot> = {};
  for (const r of rows) out[r.slot] = r;
  return out;
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
/**
 * Nav entries, for either the header or a footer column.
 *
 * placement is the header's column and footer_slot is the footer's, and
 * they are separate because one value cannot mean both: filling the footer
 * columns by moving pages out of placement is what emptied the header of
 * OEM/ODM, Quality, Factory, Small Batch, Contact and Certification.
 *
 * The href logic is identical for both — a footer entry points at a page
 * the same way a nav entry does — so this stays one function with the
 * column named rather than two that drift apart.
 */
export async function listNav(
  placement: string,
  { column = 'placement' }: { column?: 'placement' | 'footer_slot' } = {}
): Promise<NavItem[]> {
  /* Not interpolated from user input: the two callers pass literals, and a
     column name cannot be a bind parameter in SQLite. The whitelist below
     is what makes that safe. */
  const col = column === 'footer_slot' ? 'footer_slot' : 'placement';

  const rows = await cached<any[]>(
    `SELECT id, title, nav_label, external_key, placement, nav_order, target
       FROM pages
      WHERE show_in_nav = 1 AND ${col} = ?
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
  const rows = await cached<any[]>('SELECT key, value FROM settings');
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
/**
 * Fallback canonical host, used only when settings has no siteUrl.
 *
 * The custom domain oemwallclocks.com is the real one and lives in the
 * settings table; this is what renders before anyone has saved it. Having
 * it wrong for a moment is better than a build failing, but the settings
 * value is what every caller should actually use — see getSiteUrl().
 */
export const SITE_URL = 'https://oemwallclocks.com';

/** The site's canonical host, from settings, falling back to SITE_URL. */
export async function getSiteUrl(): Promise<string> {
  try {
    const s = await getSettings();
    const v = String(s.siteUrl || '').trim().replace(/\/+$/, '');
    /* Guard against a half-finished setting: an empty or non-http value
       would produce canonical tags pointing nowhere. */
    if (v.startsWith('http')) return v;
  } catch {}
  return SITE_URL;
}

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
export async function buildMeta({
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

  /* The MOQ is a number the factory can change, and the SEO copy is
     written by hand — so a description that says "MOQ 500 pcs" stays
     wrong after the minimum drops to 300, and a search result then
     contradicts the page it links to.

     Rather than making the writer remember to update six category
     descriptions by hand, the number in the text is replaced with the
     current one on the way out. Only the phrase "MOQ <number> pcs" is
     touched; every other number in the copy is the writer's own and
     stays exactly as written.

     The pattern is deliberately narrow. A blanket number substitution
     would rewrite the price range, the dimensions or a year. */
  const moqNow = Number((await getSettings().catch(() => ({} as SiteSettings))).moq) || 0;
  const syncMoq = (text: string) =>
    moqNow > 0 ? text.replace(/MOQ\s+\d+(\s*pcs)?/gi, `MOQ ${moqNow} pcs`) : text;

  const d = syncMoq(String(seoDescription || description || '').trim()).slice(0, 158);
  /* Read from settings rather than the constant: the canonical host is the
     one the owner chose, and a build-time constant means changing domain is
     a code edit and a redeploy. getSiteUrl() is itself memoised, so this
     costs nothing extra on a page that also renders the footer. */
  const site = await getSiteUrl();
  /* Normalised to no trailing slash, matching every internal link: Cloudflare
     strips the slash before the request arrives, so a canonical that kept it
     would name a URL the site redirects rather than serves. */
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`).replace(/\/+$/, '') : '';
  const url = cleanPath ? `${site}${cleanPath}` : `${site}/`;

  /* og:type is a closed vocabulary — website, article, book, profile,
     video.movie and a handful more. Passing anything else (a product page
     wanting "product", for instance) makes Next reject the whole metadata
     object: the page still renders, but with no <title> and no description
     at all, which is invisible from the front end. Anything unrecognised
     falls back to website; the Product JSON-LD below it is what actually
     marks the page as a product. */
  const OG_TYPES = new Set([
    'website', 'article', 'book', 'profile', 'music.song', 'music.album',
    'music.playlist', 'video.movie', 'video.episode', 'video.tv_show',
    'video.other', 'website'
  ]);
  const ogType = OG_TYPES.has(type) ? type : 'website';

  return {
    title: t,
    description: d,
    /* Absolute, not the path. Google resolves a relative canonical against
       whatever host it happens to be crawling, which is how a domain change
       ends up split across two identities. Passing the full URL makes the
       host the same value the sitemap and og:url use. */
    alternates: { canonical: url },
    keywords: keywords || undefined,
    openGraph: {
      title: t,
      description: d,
      url,
      type: ogType,
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

