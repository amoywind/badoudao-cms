-- Carton and freight data.
--
-- A cross-border buyer needs two numbers before they can price a
-- shipment: how much space the order takes, and what it weighs. The
-- second is the gross weight of one carton and the first is the
-- carton's dimensions multiplied by how many clocks are in it.
--
-- The fields are on the product rather than in a separate table because
-- one product has one carton — a buyer looking at a clock wants the
-- carton that clock ships in, not a list of packaging options.
--
--   carton_qty   how many clocks fit in one carton
--   carton_l/w/h the carton's outside dimensions, in centimetres
--   carton_gw    the gross weight of one filled carton, in kilograms
--
-- The dimensions are the carton's, not the clock's, which is why they
-- are not in product_specs: the spec sheet describes the product, and
-- this describes the box the product travels in.
--
-- Nullable, and every reader falls back to a stated assumption when
-- they are empty. The freight estimator on the product page needs
-- numbers to work with, and a buyer who sees "typical for a 12-inch
-- clock, adjust to your order" can still use the calculator — which is
-- better than a section that says nothing.
ALTER TABLE products ADD COLUMN carton_qty INTEGER;
ALTER TABLE products ADD COLUMN carton_l REAL;
ALTER TABLE products ADD COLUMN carton_w REAL;
ALTER TABLE products ADD COLUMN carton_h REAL;
ALTER TABLE products ADD COLUMN carton_gw REAL;
