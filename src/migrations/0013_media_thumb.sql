-- Display-sized copies, so a page does not have to ship the original.
--
-- The product photos are 2048x2048 originals from the factory. Rendered into
-- a 609px card, the browser still downloads all 954 KB of each one: PageSpeed
-- measured 2,234 KB of images on the home page, of which 1,976 KB was bytes
-- the layout never showed. Four seconds of a buyer's mobile data for pixels
-- that get scaled away.
--
-- `thumb` holds a 640px-wide WebP of the same picture — roughly 20-30 KB.
-- Cards and grids render it; `data` stays untouched so the detail view and
-- anyone who wants the full-resolution original still get the real file.
--
-- Nullable and with no backfill in this migration: rows added before it stay
-- NULL, and every caller falls back to the full image. The existing library
-- is filled in by scripts/backfill-thumbs.js, which needs sharp and runs on
-- the machine that holds the originals rather than in a migration.
ALTER TABLE media ADD COLUMN thumb TEXT;

-- The middle tier, for the one page that genuinely needs more than 640px.
--
-- The product gallery zooms to 1.75x and opens full-screen, so on a desktop
-- the original is right. But a 390px phone at 2x needs ~718 device pixels,
-- and with only 640w and 2048w available the browser's srcset picks the next
-- candidate up — the 954 KB original — for a frame that is 356 CSS px wide.
-- Measured: 751 KB on a phone, for a photo displayed at a third of the
-- screen. 1024w is comfortably more than the phone needs and about a tenth
-- of the bytes.
ALTER TABLE media ADD COLUMN thumb_lg TEXT;