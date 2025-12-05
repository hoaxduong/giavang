DO $$
DECLARE
  onus_source_id UUID;
  product_id UUID;
BEGIN
  -- Get Onus Source ID
  SELECT id INTO onus_source_id FROM crawler_sources WHERE api_type = 'onus';

  IF onus_source_id IS NOT NULL THEN
     -- Vàng Phúc Lộc Tài 99.99
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'PHUC_LOC_TAI_9999', 'Vàng Phúc Lộc Tài 99.99', true, 40)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-phuc-loc-tai-9999-00', 'PNJ', 'Vàng Phúc Lộc Tài 99.99', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;
END $$;
