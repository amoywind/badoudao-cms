-- =============================================================================
-- Badoudao CMS — D1 schema
-- =============================================================================

-- 产品 ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,              -- 型号 BD-W-1201
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

  content TEXT DEFAULT '',          -- 产品详情正文
  featured INTEGER DEFAULT 0,       -- 0/1
  status TEXT DEFAULT 'published',   -- published | draft | archived
  sort_order INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured, status);

-- 规格参数：key-value，比 JSON 列更好查询 -------------------------
CREATE TABLE IF NOT EXISTS product_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_specs_product ON product_specs(product_id);

-- 定制选项：支持排序与价格影响 ------------------------------------
CREATE TABLE IF NOT EXISTS product_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price_delta REAL DEFAULT 0,       -- 加价，EXW 口径
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_options_product ON product_options(product_id);

-- 阶梯价格 ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER,                 -- NULL = 无上限
  unit_price REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prices_product ON product_prices(product_id);

-- 分类 -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,              -- wall-clocks
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  description TEXT DEFAULT '',
  designs TEXT DEFAULT '',
  price_range TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published'
);

-- 图片库 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime TEXT DEFAULT '',
  size INTEGER DEFAULT 0,          -- bytes
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  alt TEXT DEFAULT '',
  folder TEXT DEFAULT 'uploads',
  tag TEXT DEFAULT '',             -- main | detail | scene | cert | blog
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
CREATE INDEX IF NOT EXISTS idx_media_tag    ON media(tag);

-- 产品 ↔ 图片 --------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_main INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pimages_product ON product_images(product_id);

-- 博客 -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  keyword TEXT DEFAULT '',         -- 目标关键词
  body TEXT DEFAULT '',
  author TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',      -- draft | published
  published_at TEXT,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- 页面（关于 / 工厂 / 质量等） ---------------------------------------
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,              -- factory
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  heading TEXT DEFAULT '',
  intro TEXT DEFAULT '',
  body TEXT DEFAULT '',            -- Markdown
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 询盘 -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  company TEXT DEFAULT '',
  country TEXT DEFAULT '',
  products TEXT DEFAULT '',        -- JSON array
  quantity TEXT DEFAULT '',
  custom_logo TEXT DEFAULT 'no',
  message TEXT NOT NULL,

  product_id TEXT,                 -- 关联产品（可空）
  source_page TEXT DEFAULT '',

  status TEXT DEFAULT 'new',       -- new | contacted | quoted | negotiating | won | lost
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

-- 报价记录：每次报价留档 -------------------------------------------
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

-- 成员 -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,     -- PBKDF2-SHA256
  role TEXT DEFAULT 'viewer',      -- admin | sales | content | factory | viewer
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 会话 -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 站点设置（品牌资产等） --------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 操作日志 ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT '',
  action TEXT NOT NULL,             -- create | update | delete | login
  entity TEXT NOT NULL,            -- products | inquiries | media | ...
  entity_id TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);