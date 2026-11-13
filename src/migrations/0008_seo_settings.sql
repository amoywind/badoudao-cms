-- Verification tokens.
--
-- The settings table is key/value, so these are rows rather than columns.
-- They live here instead of in a component because a verification token
-- is a one-off: pasting it into JSX means a redeploy every time Google
-- issues a new one, and the admin screen writes straight to these keys.
--
-- No analytics keys are seeded. Traffic analytics were removed on
-- 2026-11-14; a fresh install must not recreate them.
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('search_console_token', ''),
  ('bing_verification',    '');
