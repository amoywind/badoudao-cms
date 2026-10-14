-- Which customisation values apply to which product, grouped.
--
-- The six groups — frame, hands, dial, printing, movement, packaging — are
-- catalogue-wide, but what applies differs per model: a wooden wall clock
-- has no acrylic frame, and offering one anyway costs a question in the
-- reply. So the groups live in code and this table records the selections.
--
-- One row per (product, group, value). That makes "which groups does this
-- product offer" a plain SELECT, and it means a value can be added to the
-- catalogue without touching every product.
--
--   product_id   the product
--   group_key    frame | hands | dial | printing | movement | packaging
--   value        the chosen value, e.g. "Solid Wood"
--   price_delta  EXW markup for that value, 0 when it is standard
--   sort_order   display order within the group
--
-- The primary key is the triple: the same value cannot be added twice, and
-- a repeat save is a no-op rather than a duplicate row.
CREATE TABLE IF NOT EXISTS product_customisations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  value TEXT NOT NULL,
  price_delta REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  UNIQUE (product_id, group_key, value)
);

CREATE INDEX IF NOT EXISTS idx_custom_product
  ON product_customisations(product_id, group_key, sort_order);