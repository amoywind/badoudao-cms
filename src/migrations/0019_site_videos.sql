-- Site-level video slots.
--
-- The product videos table holds a video per product. These hold the
-- videos that belong to the site rather than to a product: the factory
-- footage on the home page, the four process clips on the quality page,
-- the drop test on a product page.
--
-- The slot is the primary key and it is a fixed key rather than a
-- generated one, because the front end asks for a named slot. A row per
-- slot means the layout cannot lose a hole by accident: an empty slot
-- is a row that does not exist yet, and it renders as the placeholder
-- that says what is being waited for.
--
-- Only the eleven-character YouTube id is stored. The embed snippet an
-- admin pastes is reduced to that id on the way in, so the player is
-- built by the site rather than by whatever was pasted — a pasted
-- iframe cannot carry another origin or a script into the page.

CREATE TABLE IF NOT EXISTS site_videos (
  slot TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_site_videos_order ON site_videos(sort_order);
