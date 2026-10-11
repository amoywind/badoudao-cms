/* Badoudao CMS — D1 schema (Console-friendly copy)
 *
 * Why this file exists
 * --------------------
 * Cloudflare D1's web Console runs ONE statement per Run click, so pasting the
 * original src/migrations/0001_init.sql fails partway and leaves the database
 * half-built. This copy strips all comments so the whole schema can be pasted
 * into the Console and run repeatedly — every statement is IF NOT EXISTS, so
 * re-running is harmless.
 *
 * Prefer the CLI when you can (it handles multi-statement files properly):
 *   npx wrangler d1 execute badoudao --remote --file=./src/migrations/0001_init.sql
 *
 * Usage: D1 -> badoudao -> Console, paste everything below, Run.
 * Verify: SELECT COUNT(*) FROM sqlite_master WHERE type='table';  -> 15
 */

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT DEFAULT '',
  price_min REAL DEFAULT 0,
  price_max REAL DEFAULT 0,
  moq INTEGER DEFAULT 500,
  lead_time TEXT DEFAULT '20-30 days',
  move_level TEXT DEFAULT 'China quartz',
  difficulty TEXT DEFAULT 'simple',
  content TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured, status);

CREATE TABLE IF NOT EXISTS product_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_specs_product ON product_specs(product_id);

CREATE TABLE IF NOT EXISTS product_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price_delta REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_options_product ON product_options(product_id);

CREATE TABLE IF NOT EXISTS product_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER,
  unit_price REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prices_product ON product_prices(product_id);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  description TEXT DEFAULT '',
  designs TEXT DEFAULT '',
  price_range TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime TEXT DEFAULT '',
  size INTEGER DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  alt TEXT DEFAULT '',
  folder TEXT DEFAULT 'uploads',
  tag TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
CREATE INDEX IF NOT EXISTS idx_media_tag    ON media(tag);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_main INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pimages_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  keyword TEXT DEFAULT '',
  body TEXT DEFAULT '',
  author TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  published_at TEXT,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  heading TEXT DEFAULT '',
  intro TEXT DEFAULT '',
  body TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  company TEXT DEFAULT '',
  country TEXT DEFAULT '',
  products TEXT DEFAULT '',
  quantity TEXT DEFAULT '',
  custom_logo TEXT DEFAULT 'no',
  message TEXT NOT NULL,
  product_id TEXT,
  source_page TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  owner_note TEXT DEFAULT '',
  utm_source TEXT DEFAULT '',
  utm_medium TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  referrer TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inq_status  ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inq_created ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inq_email   ON inquiries(email);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  qty INTEGER,
  unit_price REAL,
  total REAL,
  lead_time TEXT DEFAULT '',
  valid_until TEXT,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quotes_inquiry ON quotes(inquiry_id);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);