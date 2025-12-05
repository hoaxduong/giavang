-- Drop views dependent on the column
DROP VIEW IF EXISTS price_snapshots_with_names;
DROP VIEW IF EXISTS latest_prices_with_products;

-- Remove retailer column from price_snapshots table
ALTER TABLE price_snapshots
DROP COLUMN IF EXISTS retailer;

-- Recreate price_snapshots_with_names without referencing the dropped retailer column
CREATE VIEW price_snapshots_with_names AS
SELECT
  ps.id,
  ps.created_at,
  rp.retailer_code as retailer,
  ps.province,
  COALESCE(
    rp.product_name,
    (SELECT ctm.label
     FROM crawler_type_mappings ctm
     WHERE ctm.retailer_product_id = ps.retailer_product_id
       AND ctm.is_enabled = true
     LIMIT 1)
  ) as product_name,
  ps.buy_price,
  ps.sell_price,
  ps.unit,
  ps.source_url
FROM price_snapshots ps
LEFT JOIN retailer_products rp ON rp.id = ps.retailer_product_id;

COMMENT ON VIEW price_snapshots_with_names IS 'Price snapshots with product names and retailer code';

-- Recreate latest_prices_with_products view
CREATE VIEW latest_prices_with_products AS
SELECT
  ps.id,
  ps.created_at,
  rp.retailer_code as retailer,
  ps.province,
  rp.product_code,
  rp.product_name,
  ps.buy_price,
  ps.sell_price,
  ps.unit,
  ps.source_url
FROM price_snapshots ps
LEFT JOIN retailer_products rp ON rp.id = ps.retailer_product_id
WHERE ps.created_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW latest_prices_with_products IS 'Price snapshots from the last 24 hours with retailer product information';

