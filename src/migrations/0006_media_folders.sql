-- Real folders, rather than grouping the folder column of media.
--
-- The media list derived its folders from GROUP BY media.folder, so a
-- folder only existed once something had been uploaded into it — which
-- made it impossible to set up a structure before adding the photos. An
-- empty folder was not representable at all.
--
-- media.folder now points here by name rather than holding the structure.
ALTER TABLE media ADD COLUMN folder_id TEXT;

CREATE TABLE IF NOT EXISTS media_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent TEXT NOT NULL DEFAULT '',      -- parent folder name, '' at the root
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_folders_path ON media_folders(parent, name);

-- Seed from the folder names already in use, so existing uploads keep their
-- grouping and nothing appears to move.
INSERT OR IGNORE INTO media_folders (id, name, parent)
SELECT 'fld_' || lower(replace(replace(replace(folder, '/', '_'), ' ', '_'), '-', '_')),
       folder, ''
  FROM media
 WHERE folder IS NOT NULL AND folder <> ''
 GROUP BY folder;

-- A sensible starting structure for a clock factory. Names match the
-- existing convention so media uploaded before this still lines up.
INSERT OR IGNORE INTO media_folders (id, name, parent) VALUES
  ('fld_products',  'products',  ''),
  ('fld_news',      'news',      ''),
  ('fld_articles',  'articles',  ''),
  ('fld_certs',     'certs',     ''),
  ('fld_uploads',   'uploads',   '');

INSERT OR IGNORE INTO media_folders (id, name, parent) VALUES
  ('fld_f_wall',      'wall-clocks',      'products'),
  ('fld_f_alarm',     'alarm-clocks',     'products'),
  ('fld_f_desk',      'desk-clocks',      'products'),
  ('fld_f_metal',     'metal-clocks',     'products'),
  ('fld_f_wood',      'wood-clocks',      'products'),
  ('fld_f_movement',  'clock-movements',  'products'),
  ('fld_f_exhibition','exhibition',       'news'),
  ('fld_f_line',      'production-line',  'news');
