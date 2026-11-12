-- 0020_pages_kind.sql
--
-- The pages table used to hold two different things in one shape: documents
-- rendered by /p/[slug], and menu entries that only point at hard-coded
-- routes. Nothing recorded which was which, so three consumers guessed —
-- the sitemap guessed on body length, /p/[slug] did not guess at all and
-- served 16 empty pages with a canonical, and the admin listed all 21 rows
-- as if each were a page with a /p/{id}/ URL.
--
-- kind makes the distinction explicit:
--   content — a document with a body, served at /p/{id}; editable + SEO
--   fixed   — a hard-coded route whose markup lives in src/app; SEO only
--   nav     — a menu entry pointing at another route; no page, no SEO
--
-- route is the canonical path a fixed row stands for. buildMeta() already
-- receives that path from every page, so it can look the row up in one place
-- instead of editing ten page.tsx files. meta_keywords gives the admin the
-- third SEO field the editor already supports.
--
-- Nothing is deleted. The 16 menu rows keep their ids and their navigation
-- settings, so Header() and Footer() keep reading exactly the same entries.
--
-- NOTE for run-d1.js: no empty string literal is used anywhere in this file.
-- Its statement splitter treats two adjacent quotes as an escaped quote
-- inside a string, which would swallow the rest of the file. Columns left
-- out of the INSERTs below simply take their DEFAULT from the table.

ALTER TABLE pages ADD COLUMN kind TEXT NOT NULL DEFAULT 'content';
ALTER TABLE pages ADD COLUMN route TEXT NOT NULL DEFAULT '';
ALTER TABLE pages ADD COLUMN meta_keywords TEXT NOT NULL DEFAULT '';

-- The five documents. Explicit ids rather than a body-length heuristic: a
-- heuristic is what let a menu row grow a body and become a published page.
UPDATE pages SET kind = 'content' WHERE id IN (
  'certification', 'factory', 'oem-odm', 'quality', 'small-batch'
);

-- The menu-only rows. Four of these are currently orphaned (nav-home,
-- nav-products, nav-about, nav-news); they are kept, just classified, so
-- deleting them stays a separate decision the owner makes.
UPDATE pages SET kind = 'nav' WHERE id IN (
  'f-news',
  'nav-4step-qc', 'nav-about', 'nav-about-factory', 'nav-articles',
  'nav-base-platforms', 'nav-components', 'nav-components-studio',
  'nav-contact', 'nav-craft', 'nav-custom-services', 'nav-customizer-hub',
  'nav-home', 'nav-modular-anatomy', 'nav-news', 'nav-products'
);

-- Fixed routes. seo_title and meta_keywords are seeded with the values the
-- code currently hard-codes, so running this migration changes no live
-- title. seo_description is deliberately left at its DEFAULT: those
-- descriptions interpolate MOQ, quote hours and product counts at request
-- time, and freezing a copy into D1 would quietly make them stale. An empty
-- override falls through to the live generated description.
--
-- show_in_nav = 0 keeps these out of listNav(); the menu entries above are
-- the ones that actually put a fixed route into the header or footer.
INSERT OR IGNORE INTO pages
  (id, slug, title, kind, route, seo_title, meta_keywords, show_in_nav)
VALUES
  ('fixed-home', 'fixed-home', '首页 HOME', 'fixed', '/',
   'Quartz Clock Manufacturer China — OEM & ODM Wholesale | Badoudao',
   'quartz clock manufacturer, OEM clock factory, wholesale wall clocks, China clock supplier, custom quartz clocks',
   0),
  ('fixed-about-us', 'fixed-about-us', '关于工厂 About Us', 'fixed', '/about-us',
   'About the Factory — Wall Clock Manufacturer in Xiamen | Badoudao',
   'china wall clock manufacturer, xiamen clock factory, quartz clock OEM supplier, low MOQ wall clock supplier, small batch wall clock factory, custom wall clock manufacturer china',
   0),
  ('fixed-customizer', 'fixed-customizer', '定制器 Customizer', 'fixed', '/customizer',
   'Wall Clock Configurator — Build Your OEM Spec | Badoudao',
   'wall clock configurator, custom wall clock builder, OEM clock specification, custom clock quote tool, bespoke clock manufacturer',
   0),
  ('fixed-custom-services', 'fixed-custom-services', '定制服务 Custom Services', 'fixed', '/custom-services',
   'Custom Services & Clock Anatomy — OEM/ODM | Badoudao',
   'custom clock manufacturer, OEM clock parts, private label wall clock, clock dial printing, bespoke clock supplier',
   0),
  ('fixed-components', 'fixed-components', '零件与包装 Components', 'fixed', '/components',
   'Clock Hands, Movements & Packaging — Components Studio | Badoudao',
   'clock hands manufacturer, wholesale clock movements, quartz movement supplier, clock packaging OEM, custom clock components',
   0),
  ('fixed-craft-qc', 'fixed-craft-qc', '材质与工艺 Craft & QC', 'fixed', '/craft-qc',
   'Material & Craft — 8 Materials, 4-Step QC Factory | Badoudao',
   'clock manufacturing process, quartz clock QC, drop test packaging, acrylic clock printing, resin clock casting',
   0),
  ('fixed-products', 'fixed-products', '产品目录 Products', 'fixed', '/products',
   'Wholesale Quartz Clocks — OEM & ODM Catalogue | Badoudao',
   'wholesale quartz clocks, quartz clock catalogue, OEM clock models, clock movement supplier',
   0),
  ('fixed-articles', 'fixed-articles', '采购指南 Articles', 'fixed', '/articles',
   'Quartz Clock Buying Guides — MOQ, Pricing, Certification | Badoudao',
   'quartz clock buying guide, clock MOQ, ex works pricing, quartz clock certification',
   0);

-- Contact and News have no hard-coded keywords. meta_keywords is omitted so
-- it takes the DEFAULT instead of writing an empty string literal.
INSERT OR IGNORE INTO pages
  (id, slug, title, kind, route, seo_title, show_in_nav)
VALUES
  ('fixed-contact', 'fixed-contact', '联系与询盘 Contact', 'fixed', '/contact',
   'Contact Badoudao | Get a Quotation for Wholesale Clocks',
   0),
  ('fixed-news', 'fixed-news', '公司新闻 News', 'fixed', '/news',
   'Company News — Factory Updates from Badoudao Quartz Clocks',
   0);
