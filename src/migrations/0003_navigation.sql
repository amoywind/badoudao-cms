-- =====================================================================
-- 0003 · Navigation driven by the pages table
--
-- The header and footer menus used to be hard-coded in SiteChrome.tsx.
-- These rows move them into D1 so the admin can rename, reorder and hide
-- entries without a code change or a redeploy.
--
-- Run AFTER 0002 — it relies on the placement / nav_label / nav_order /
-- show_in_nav / external_key columns that migration adds.
--
-- Two kinds of rows are involved:
--   1. existing content pages (oem-odm, factory …) get their menu
--      position set here — they keep their body and URL, we only fill in
--      the navigation columns;
--   2. nav-* rows are menu-only entries for fixed routes that have no
--      page of their own (/products/, /articles/, /news/ …), so the whole
--      menu can be reordered from one place.
--
-- Idempotent: the upsert form updates on slug conflict rather than
-- inserting duplicates.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Header bar — content pages that are already in the database
-- ---------------------------------------------------------------------

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('oem-odm', 'oem-odm', 'OEM / ODM', 'OEM and ODM clock manufacturing',
 'Two ways to work with us: OEM, where you supply artwork and we build to your specification; or ODM, where you start from an existing platform and modify it to your brand.',
 'OEM & ODM Quartz Clock Manufacturing | Badoudao', '', 'published', 1,
 'top_nav', 'OEM / ODM', 2, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('small-batch', 'small-batch', 'Small Batch', 'Small batch quartz clocks',
 'MOQ starts at 500 pieces, so you can test a range before committing to a full container.',
 '', '', 'published', 2, 'top_nav', 'Small Batch', 3, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('factory', 'factory', 'Factory', 'About the factory',
 '', '', '', 'published', 3, 'top_nav', 'Factory', 4, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('quality', 'quality', 'Quality', 'Quality control',
 '', '', '', 'published', 4, 'top_nav', 'Quality', 5, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('certification', 'certification', 'Certification', 'Certification and compliance',
 '', '', '', 'published', 5, 'footer_2', 'Certification', 4, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;


-- ---------------------------------------------------------------------
-- 2. Header bar — menu-only entries for fixed routes
-- ---------------------------------------------------------------------

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('nav-products', 'nav-products', 'Products', '', '', '', '',
 'published', 90, 'top_nav', 'Products', 1, 1, 'products')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('nav-articles', 'nav-articles', 'Articles', '', '', '', '',
 'published', 91, 'top_nav', 'Articles', 6, 1, 'articles')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('nav-news', 'nav-news', 'Company News', '', '', '', '',
 'published', 92, 'top_nav', 'Company News', 7, 1, 'news')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('nav-contact', 'nav-contact', 'Contact', '', '', '', '',
 'published', 93, 'top_nav', 'Contact', 8, 1, 'contact')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;


-- ---------------------------------------------------------------------
-- 3. Footer columns
-- ---------------------------------------------------------------------
-- Column 1 (Products) is filled from the categories table at render time,
-- so it needs no rows here.

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('f-oem-odm', 'f-oem-odm', 'OEM Manufacturing', '', '', '', '',
 'published', 94, 'footer_2', 'OEM Manufacturing', 1, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('f-small-batch', 'f-small-batch', 'Small Batch Runs', '', '', '', '',
 'published', 95, 'footer_2', 'Small Batch Runs', 2, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('f-quality', 'f-quality', 'Quality Control', '', '', '', '',
 'published', 96, 'footer_2', 'Quality Control', 3, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('f-factory', 'f-factory', 'About the Factory', '', '', '', '',
 'published', 97, 'footer_3', 'About the Factory', 1, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('f-articles', 'f-articles', 'Buying Guides', '', '', '', '',
 'published', 98, 'footer_3', 'Buying Guides', 3, 1, 'articles')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('f-contact', 'f-contact', 'Contact', '', '', '', '',
 'published', 99, 'footer_3', 'Contact', 4, 1, 'contact')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('f-moq', 'f-moq', 'MOQ Explained', '', '', '', '',
 'published', 100, 'footer_4', 'MOQ Explained', 1, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('f-cert-guide', 'f-cert-guide', 'CE & RoHS Guide', '', '', '', '',
 'published', 101, 'footer_4', 'CE & RoHS Guide', 2, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav, external_key)
VALUES ('f-news', 'f-news', 'Company News', '', '', '', '',
 'published', 102, 'footer_4', 'Company News', 3, 1, 'news')
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav,
  external_key = excluded.external_key;