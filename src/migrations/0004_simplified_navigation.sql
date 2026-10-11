-- =====================================================================
-- 0004 · Simplify the navigation to six primary entries
--
-- The header had grown to eight items as features were added one at a
-- time, which left a buyer seven ways to leave the page they were on and
-- no obvious route between the ones that matter.
--
-- The owner settled on six:
--   Home · Products · Factory · Quality · Cases · Contact
--
-- Two of the previous entries survive in the footer only. OEM/ODM and
-- Small Batch are real pages with real content, so removing them entirely
-- would strand that copy — they just do not need to be in the header.
--
-- show_in_nav = 0 rather than DELETE: an entry removed this way keeps
-- working at its URL, so an old bookmark or a shared link does not 404.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Header — add Home, then reduce to the six
-- ---------------------------------------------------------------------

-- Home cannot be expressed as an external_key suffix, so it carries a
-- fixed id that listNav() maps to "/" explicitly.
INSERT INTO pages (id, slug, title, heading, intro, seo_title, seo_description,
                   status, sort_order, placement, nav_label, nav_order, show_in_nav)
VALUES ('nav-home', 'nav-home', 'Home', '', '', '', '',
 'published', 89, 'top_nav', 'Home', 1, 1)
ON CONFLICT(id) DO UPDATE SET
  placement = excluded.placement,
  nav_label = excluded.nav_label,
  nav_order = excluded.nav_order,
  show_in_nav = excluded.show_in_nav;

UPDATE pages SET nav_order = 2 WHERE id = 'nav-products';
UPDATE pages SET nav_label = 'Factory', nav_order = 3 WHERE id = 'nav-factory';
UPDATE pages SET nav_label = 'Quality', nav_order = 4 WHERE id = 'nav-quality';

-- Cases points at the articles system: customer stories and examples are
-- what a buyer scans here, not buying guides. This row stays visible —
-- only nav-news is hidden below.
UPDATE pages SET nav_label = 'Cases', nav_order = 5, show_in_nav = 1 WHERE id = 'nav-articles';

UPDATE pages SET nav_label = 'Contact', nav_order = 6 WHERE id = 'nav-contact';

-- Out of the header. These are content pages, not menu-only rows, so they
-- are listed by id rather than by placement.
UPDATE pages SET show_in_nav = 0 WHERE id IN ('oem-odm', 'small-batch');
UPDATE pages SET show_in_nav = 0 WHERE id IN ('nav-oem-odm', 'nav-small-batch', 'nav-news');


-- ---------------------------------------------------------------------
-- 2. Footer — keep the detail pages that no longer fit in the header
-- ---------------------------------------------------------------------
-- Column 1 (Products) still comes from the categories table at render
-- time and needs no rows.

UPDATE pages SET placement = 'footer_2', nav_label = 'OEM / ODM Manufacturing',
                 nav_order = 1, target = 'oem-odm', show_in_nav = 1 WHERE id = 'f-oem-odm';
UPDATE pages SET placement = 'footer_2', nav_label = 'Small Batch Runs',
                 nav_order = 2, target = 'small-batch', show_in_nav = 1 WHERE id = 'f-small-batch';
UPDATE pages SET placement = 'footer_2', nav_label = 'Quality Control',
                 nav_order = 3, target = 'quality', show_in_nav = 1 WHERE id = 'f-quality';
UPDATE pages SET placement = 'footer_2', nav_label = 'Certification',
                 nav_order = 4, target = 'certification', show_in_nav = 1 WHERE id = 'f-certification';

UPDATE pages SET placement = 'footer_3', nav_label = 'About the Factory',
                 nav_order = 1, target = 'factory', show_in_nav = 1 WHERE id = 'f-factory';
UPDATE pages SET placement = 'footer_3', nav_label = 'Contact Us', nav_order = 2,
                 target = '', external_key = 'contact', show_in_nav = 1 WHERE id = 'f-contact';

UPDATE pages SET placement = 'footer_4', nav_label = 'MOQ Explained',
                 nav_order = 1, target = 'small-batch', show_in_nav = 1 WHERE id = 'f-moq';
UPDATE pages SET placement = 'footer_4', nav_label = 'CE & RoHS Guide',
                 nav_order = 2, target = 'certification', show_in_nav = 1 WHERE id = 'f-cert-guide';
UPDATE pages SET placement = 'footer_4', nav_label = 'Case Studies', nav_order = 3,
                 target = '', external_key = 'articles', show_in_nav = 1 WHERE id = 'f-articles';

-- Company News keeps a row so the column is not left short, but sits last
-- because it is trust content rather than something a buyer is looking for.
UPDATE pages SET placement = 'footer_4', nav_label = 'Company News', nav_order = 4,
                 target = '', external_key = 'news', show_in_nav = 1 WHERE id = 'f-news';