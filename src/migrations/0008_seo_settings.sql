-- Verification tokens and analytics.
--
-- The settings table is key/value, so these are rows rather than columns.
-- They live here instead of in a component because a verification token
-- is a one-off: pasting it into JSX means a redeploy every time Google
-- issues a new one, and the admin screen writes straight to these keys.
--
-- Plausible over GA4 on purpose. No cookie banner is needed where no
-- personal data is collected, and it adds no third-party script to a page
-- whose only job is to load on a slow phone connection.
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('search_console_token', ''),
  ('bing_verification',    ''),
  ('plausible_domain',     '');
