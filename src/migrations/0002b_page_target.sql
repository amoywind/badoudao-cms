-- Menu-only rows (a footer entry that mirrors a content page) need to say
-- which page they point at. external_key covers fixed routes; target
-- covers a sibling row in the pages table.
ALTER TABLE pages ADD COLUMN target TEXT DEFAULT '';
