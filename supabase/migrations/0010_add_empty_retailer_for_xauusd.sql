-- Add empty retailer for XAU/USD world gold prices
-- This retailer is used to store world gold prices that don't belong to any specific Vietnamese retailer

INSERT INTO retailers (code, name, is_enabled, sort_order)
VALUES ('', 'Giá Vàng Thế Giới', true, -1)
ON CONFLICT (code) DO NOTHING;

-- Add a retailer product for XAU/USD under the empty retailer
INSERT INTO retailer_products (retailer_code, product_code, product_name, description, is_enabled, sort_order)
VALUES ('', 'XAUUSD', 'XAU/USD', 'Giá vàng thế giới tính theo USD/oz', true, 0)
ON CONFLICT (retailer_code, product_code) DO NOTHING;

-- Add type mapping for XAU/USD in Onus crawler source
-- This maps the external code 'xauusd' to the empty retailer and XAUUSD product
INSERT INTO crawler_type_mappings (
  source_id,
  external_code,
  retailer_code,
  label,
  is_enabled,
  retailer_product_id
)
SELECT 
  cs.id,
  'xauusd',
  '',
  'XAU/USD',
  true,
  rp.id
FROM crawler_sources cs
CROSS JOIN retailer_products rp
WHERE cs.name = 'Onus'
  AND rp.retailer_code = ''
  AND rp.product_code = 'XAUUSD'
ON CONFLICT (source_id, external_code) DO UPDATE
SET 
  retailer_code = EXCLUDED.retailer_code,
  label = EXCLUDED.label,
  is_enabled = EXCLUDED.is_enabled,
  retailer_product_id = EXCLUDED.retailer_product_id;

