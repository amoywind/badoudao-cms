-- Owner-managed SEO tags.
--
-- The product page's material and movement tags were generated from the
-- spec rows and the movement field, with their destinations written into
-- product-detail.ts. That worked, but there was nowhere to change a
-- destination, rename a tag, or hide one without a code change and a
-- deploy — and the whole point of a tag is where it points.
--
-- So the catalogue lives here: name, destination, order, and whether it is
-- shown. A tag with active = 0 stays in the list so turning it back on does
-- not mean retyping it.
--
-- scope = 'global' applies the tag to every product, which is the usual
-- case: "MDF Wood" belongs on every MDF product whatever its category.
-- scope = 'category' restricts it to the category named in scope_value,
-- which is for something like "Radio Controlled" that only applies to
-- alarm clocks.
--
--   key          slug, stable: renaming the label does not break it
--   label        what the visitor reads
--   href         where it goes; must be a site path or a full URL
--   scope        'global' | 'category'
--   scope_value  category id, when scope = 'category'
--   sort_order   display order, ascending
CREATE TABLE IF NOT EXISTS seo_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  scope_value TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_seo_tags_active ON seo_tags(active, sort_order);
