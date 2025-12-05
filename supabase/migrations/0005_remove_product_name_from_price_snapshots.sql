-- Drop view dependent on the column
DROP VIEW IF EXISTS price_snapshots_with_names;

-- Remove product_name column from price_snapshots table
ALTER TABLE price_snapshots
DROP COLUMN IF EXISTS product_name;

-- Drop indexes that were using product_name if they exist
DROP INDEX IF EXISTS idx_price_snapshots_product_name;
DROP INDEX IF EXISTS idx_price_snapshots_retailer_product_name;

-- Recreate view without referencing the dropped column
CREATE VIEW price_snapshots_with_names AS
SELECT
  ps.id,
  ps.created_at,
  ps.retailer,
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

COMMENT ON VIEW price_snapshots_with_names IS 'Price snapshots with product names';
