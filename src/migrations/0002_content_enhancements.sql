-- =====================================================================
-- 002 · Content, media and enquiry enhancements
--
-- Written so it can be applied to the live database without losing data.
-- Every statement is additive: new columns carry defaults, new tables are
-- independent. Nothing here drops or renames anything.
--
-- D1's web Console runs ONE statement per submission — run this file
-- through scripts/run-d1.js, or paste it statement by statement.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Enquiry attachments — buyer-uploaded drawings and reference files
-- ---------------------------------------------------------------------
-- The old form had no way to accept a file, so buyers had to email
-- drawings separately. Attachments hang off the inquiry and cascade on
-- delete so removing an enquiry takes its files with it.

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,

  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime TEXT DEFAULT '',
  size INTEGER DEFAULT 0,              -- bytes

  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_inquiry ON attachments(inquiry_id);


-- ---------------------------------------------------------------------
-- 2. WhatsApp on enquiries
-- ---------------------------------------------------------------------
-- Buyers asked for a WhatsApp number rather than a phone field, because
-- that is how they actually reach a factory overseas. Kept separate from
-- `country` so it can be normalised to an international format later.

ALTER TABLE inquiries ADD COLUMN whatsapp TEXT DEFAULT '';

-- Optional drawing reference supplied before the form is sent.
ALTER TABLE inquiries ADD COLUMN has_attachment INTEGER DEFAULT 0;


-- ---------------------------------------------------------------------
-- 3. Product videos — YouTube only, self-hosted video is not worth it
-- ---------------------------------------------------------------------
-- Stores the 11-character YouTube id, never the full URL: the id survives
-- a change of front-end player and keeps the column narrow.

CREATE TABLE IF NOT EXISTS product_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  youtube_id TEXT NOT NULL,            -- 11 chars, e.g. dQw4w9WgXcQ
  title TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_videos_product ON product_videos(product_id);


-- ---------------------------------------------------------------------
-- 4. SEO fields on products and categories
-- ---------------------------------------------------------------------
-- posts and pages already carry these two columns; the remaining tables
-- did not, so the admin had nowhere to put a per-entity override.

ALTER TABLE products ADD COLUMN seo_title TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN seo_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN meta_keywords TEXT DEFAULT '';

ALTER TABLE categories ADD COLUMN seo_title TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN seo_description TEXT DEFAULT '';


-- ---------------------------------------------------------------------
-- 5. Navigation placement for content pages
-- ---------------------------------------------------------------------
-- Navigation used to be hard-coded inside SiteChrome.tsx, so reordering a
-- menu item meant editing and redeploying. These columns let the admin
-- own both the header bar and the five footer columns.
--
-- placement values:
--   content    — a standalone content page, not linked in any menu
--   top_nav    — main header bar
--   footer_1   … footer_5 — the five footer columns
--
-- external_key lets a menu entry point at a fixed route that has no row
-- here (/products/, /articles/, /news/…), so the whole menu stays
-- editable in one place.

ALTER TABLE pages ADD COLUMN placement TEXT DEFAULT 'content';
ALTER TABLE pages ADD COLUMN nav_label TEXT DEFAULT '';
ALTER TABLE pages ADD COLUMN nav_order INTEGER DEFAULT 0;
ALTER TABLE pages ADD COLUMN show_in_nav INTEGER DEFAULT 1;
ALTER TABLE pages ADD COLUMN external_key TEXT DEFAULT '';


-- ---------------------------------------------------------------------
-- 6. Posts: split articles from company news, and add a cover image
-- ---------------------------------------------------------------------
-- Both live in one table on purpose — the fields are identical and the
-- admin gets a single publishing queue with a type switch.
--
--   type = 'article' — expert buying guides, written for search traffic
--   type = 'news'    — factory updates, exhibitions, shipments; these are
--                      trust-building and are not aimed at rankings

ALTER TABLE posts ADD COLUMN type TEXT DEFAULT 'article';
ALTER TABLE posts ADD COLUMN cover TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN excerpt TEXT DEFAULT '';


-- ---------------------------------------------------------------------
-- 7. Media: real pixel dimensions
-- ---------------------------------------------------------------------
-- width/height columns already existed but were never populated, so the
-- library could not warn about non-square uploads or group assets by size.

-- Existing rows are left at 0 on purpose: the values are unknown, and a
-- wrong number would be worse than none. They are filled in on re-upload.