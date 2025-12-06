-- 0007_remove_province_code_from_mappings.sql
-- Remove province_code from crawler_type_mappings as part of the refactor
-- to rely on retailer_product_id and dynamic province handling.

ALTER TABLE crawler_type_mappings
DROP COLUMN IF EXISTS province_code;
