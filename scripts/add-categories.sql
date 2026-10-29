-- Two new material categories.
--
-- Marble and 3D printing are both lines the factory can make rather than
-- lines it currently lists, so the copy says what can be done and not
-- what is on the shelf: no prices are given, because there is no
-- catalogue behind them yet and a price range that is not a real one
-- is worse than no price range at all.
--
-- The designs column is left empty on purpose. It carries a count of
-- styles, and nobody has counted the styles in these two lines yet.
-- It is only read by one meta description template, which the
-- hand-written seo_description below replaces anyway.

INSERT OR REPLACE INTO categories
  (id, name, short, description, designs, price_range, sort_order, status, seo_title, seo_description)
VALUES
  (
    'marble-wall-clocks',
    'Marble Wall Clock',
    'Marble Wall Clock',
    'Natural Marble Wall Clocks — Stone Cut and CNC-Machined OEM
Extend your wall clock range with genuine natural marble, cut and CNC-machined in our Xiamen workshop. No two slabs share a vein pattern, which is precisely what buyers of design-led homeware are paying for. We produce floating slab clocks, fully sculpted round marble clocks, and frameless marble dials fitted with brass or aluminium hands, finished to a matte or polished surface. Marble is heavy and brittle in transit, so every clock is foam-nested and drop-tested to ISTA standards before it leaves the line.',
    '',
    '',
    7,
    'published',
    'Marble Wall Clock Manufacturer | Natural Stone OEM',
    'Natural marble wall clock manufacturer in China. Wholesale CNC-cut stone clocks, ISTA drop tested, MOQ 300 pcs, Ex Works.'
  ),
  (
    '3d-printed-wall-clocks',
    '3D Printed Wall Clock',
    '3D Printed Wall Clock',
    '3D Printed Wall Clocks — No Mould, No Tooling Cost
Add a product line without committing to a mould. Our 3D printed wall clocks are produced by SLA resin printing and FDM, so a clock can be a one-off prototype and a thousand-piece run from the same file, with no tooling cost and no lead time waiting for a tool. We print hollow lattice dials, spiral and topographic faces, and sculptural abstract forms, then finish them by hand — sanding, priming and painting to a matte, gloss or metallic effect. Because the process needs no mould, small batches are practical here in a way they are not for injection-moulded clocks.',
    '',
    '',
    8,
    'published',
    '3D Printed Wall Clock Manufacturer | No-Mould OEM',
    '3D printed wall clock manufacturer in China. Wholesale SLA resin printed clocks, no mould cost, MOQ 300 pcs, Ex Works.'
  );
