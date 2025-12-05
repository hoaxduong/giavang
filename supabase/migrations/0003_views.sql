-- 0003_views.sql
-- Consolidated views

-- 1. Latest Prices with Products
CREATE VIEW latest_prices_with_products AS
SELECT
  ps.id,
  ps.created_at,
  ps.retailer,
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


-- 2. Retailer Product Catalog
CREATE VIEW retailer_product_catalog AS
SELECT
  rp.id,
  rp.retailer_code,
  r.name as retailer_name,
  rp.product_code,
  rp.product_name,
  rp.is_enabled,
  rp.sort_order,
  COUNT(DISTINCT ctm.id) as mapping_count,
  (
    SELECT ps.created_at
    FROM price_snapshots ps
    WHERE ps.retailer_product_id = rp.id
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) as last_price_update,
  (
    SELECT ps.buy_price
    FROM price_snapshots ps
    WHERE ps.retailer_product_id = rp.id
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) as latest_buy_price,
  (
    SELECT ps.sell_price
    FROM price_snapshots ps
    WHERE ps.retailer_product_id = rp.id
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) as latest_sell_price
FROM retailer_products rp
JOIN retailers r ON r.code = rp.retailer_code
LEFT JOIN crawler_type_mappings ctm ON ctm.retailer_product_id = rp.id
GROUP BY rp.id, r.name
ORDER BY rp.retailer_code, rp.sort_order, rp.product_name;

COMMENT ON VIEW retailer_product_catalog IS 'Complete catalog of retailer products with latest price information';


-- 3. Price Snapshots with Names
CREATE VIEW price_snapshots_with_names AS
SELECT
  ps.id,
  ps.created_at,
  ps.retailer,
  ps.province,
  COALESCE(
    ps.product_name,
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


-- 4. Current API Keys
CREATE OR REPLACE VIEW current_api_keys AS
SELECT DISTINCT ON (provider, scope)
  id,
  provider,
  scope,
  api_key,
  expires_at,
  last_used_at,
  request_count
FROM api_keys
WHERE is_active = true
  AND expires_at > NOW()
ORDER BY provider, scope, expires_at DESC;
