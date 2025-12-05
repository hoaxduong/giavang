-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- ============================================================================
-- RETAILERS
-- ============================================================================

INSERT INTO retailers (code, name, sort_order, is_enabled) VALUES
  ('SJC', 'SJC - Công ty SJC', 1, true),
  ('DOJI', 'DOJI', 2, true),
  ('PNJ', 'PNJ', 3, true),
  ('Bảo Tín Minh Châu', 'Bảo Tín Minh Châu', 4, true),
  ('Phú Quý', 'Phú Quý', 5, true),
  ('Bảo Tín Phú Khương', 'Bảo Tín Phú Khương', 6, true),
  ('Mi Hồng', 'Mi Hồng', 7, true),
  ('BTMH', 'Bảo Tín Mạnh Hải', 8, true),
  ('Ngọc Thẩm', 'Ngọc Thẩm', 9, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled;

-- ============================================================================
-- PROVINCES
-- ============================================================================

INSERT INTO provinces (code, name, sort_order, is_enabled) VALUES
  ('TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 1, true),
  ('Hà Nội', 'Hà Nội', 2, true),
  ('Đà Nẵng', 'Đà Nẵng', 3, true),
  ('Cần Thơ', 'Cần Thơ', 4, true),
  ('Hải Phòng', 'Hải Phòng', 5, true),
  ('Biên Hòa', 'Biên Hòa', 6, true),
  ('Nha Trang', 'Nha Trang', 7, true),
  ('Huế', 'Huế', 8, true),
  ('Vũng Tàu', 'Vũng Tàu', 9, true),
  ('Buôn Ma Thuột', 'Buôn Ma Thuột', 10, true),
  ('Quy Nhơn', 'Quy Nhơn', 11, true),
  ('Thái Nguyên', 'Thái Nguyên', 12, true),
  ('Quảng Ninh', 'Quảng Ninh', 13, true),
  ('Thừa Thiên Huế', 'Thừa Thiên Huế', 14, true),
  ('Quảng Ngãi', 'Quảng Ngãi', 15, true),
  ('Khánh Hòa', 'Khánh Hòa', 16, true),
  ('Đồng Nai', 'Đồng Nai', 17, true),
  ('Bạc Liêu', 'Bạc Liêu', 18, true),
  ('Cà Mau', 'Cà Mau', 19, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- BLOG CATEGORIES
-- ============================================================================

INSERT INTO blog_categories (slug, name, description, sort_order)
VALUES
  ('tin-tuc-vang', 'Tin tức vàng', 'Tin tức và phân tích thị trường vàng', 1),
  ('huong-dan', 'Hướng dẫn', 'Hướng dẫn đầu tư và giao dịch vàng', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- CRAWLER SOURCES
-- ============================================================================

-- SJC Source
INSERT INTO crawler_sources (
  name,
  api_url,
  api_type,
  is_enabled,
  rate_limit_per_minute,
  timeout_seconds,
  priority,
  headers,
  field_mappings
) VALUES (
  'SJC',
  'https://sjc.com.vn/GoldPrice/Services/PriceService.ashx',
  'sjc',
  true,
  60,
  30,
  2,
  '{"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"}'::jsonb,
  '{
    "dataPath": "data",
    "fields": {
      "typeCode": "TypeName",
      "buyPrice": "BuyValue",
      "sellPrice": "SellValue",
      "timestamp": "latestDate",
      "branch": "BranchName"
    },
    "transforms": {
      "timestamp": "custom",
      "priceMultiplier": 1
    }
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET
  api_url = EXCLUDED.api_url,
  api_type = EXCLUDED.api_type,
  is_enabled = EXCLUDED.is_enabled,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  timeout_seconds = EXCLUDED.timeout_seconds,
  priority = EXCLUDED.priority,
  headers = EXCLUDED.headers,
  field_mappings = EXCLUDED.field_mappings;

-- Onus Source
INSERT INTO crawler_sources (
  name,
  api_url,
  api_type,
  is_enabled,
  rate_limit_per_minute,
  timeout_seconds,
  priority,
  headers,
  retailer_filter
) VALUES (
  'Onus',
  'https://exchange.goonus.io/exchange/api/v1/golds',
  'onus',
  true,
  30,
  30,
  3,
  '{"Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; GoldPriceApp/1.0)"}'::jsonb,
  NULL
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ZONE MAPPINGS
-- ============================================================================

INSERT INTO zone_mappings (source_id, zone_text, province_code, is_enabled)
SELECT
  cs.id,
  mappings.zone,
  mappings.province,
  true
FROM crawler_sources cs,
  (VALUES
    ('Hồ Chí Minh', 'TP. Hồ Chí Minh'),
    ('Hà Nội', 'Hà Nội'),
    ('Đà Nẵng', 'Đà Nẵng'),
    ('Cần Thơ', 'Cần Thơ')
  ) AS mappings(zone, province)
WHERE cs.api_type = 'onus'
ON CONFLICT (source_id, zone_text) DO NOTHING;

-- ============================================================================
-- UNIFIED RETAILER PRODUCTS & TYPE MAPPINGS
-- ============================================================================

DO $$
DECLARE
  sjc_source_id UUID;
  onus_source_id UUID;
  product_id UUID;
BEGIN
  -- Get Source IDs
  SELECT id INTO sjc_source_id FROM crawler_sources WHERE api_type = 'sjc';
  SELECT id INTO onus_source_id FROM crawler_sources WHERE api_type = 'onus';

  -- ============================================================================
  -- 1. SJC PRODUCTS (Consolidated)
  -- ============================================================================

  -- 1.1 Vàng miếng SJC 1L, 10L, 1KG
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'MIENG_1L', 'Vàng miếng SJC 1L, 10L, 1KG', true, 1)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  -- SJC Crawler Mapping
  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Vàng SJC 1L, 10L, 1KG', 'SJC', 'Vàng miếng SJC 1L, 10L, 1KG', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- Onus Crawler Mapping
  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-1l-10l-1kg', 'SJC', 'Vàng miếng SJC 1L, 10L, 1KG', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.2 Vàng SJC 5 chỉ
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'MIENG_5C', 'Vàng SJC 5 chỉ', true, 2)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  -- SJC Crawler Mapping
  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Vàng SJC 5c', 'SJC', 'Vàng SJC 5 chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- Onus Crawler Mapping
  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-5c', 'SJC', 'Vàng SJC 5 chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.3 Vàng SJC 2 chỉ, 1 chỉ, 5 phân (Common SJC grouping)
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'MIENG_1C_2C_5PHAN', 'Vàng SJC 1 chỉ, 2 chỉ, 5 phân', true, 3)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  -- SJC Crawler Mapping
  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Vàng SJC 2c, 1c, 5 phân', 'SJC', 'Vàng SJC 2c, 1c, 5 phân', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- Onus Crawler Mapping
  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-2c-1c-5-phan', 'SJC', 'Vàng SJC 1 chỉ, 2 chỉ, 5 phân', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

   -- 1.4 Vàng SJC 2 chỉ (Separate product if needed by Onus)
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'MIENG_2C', 'Vàng SJC 2 chỉ', true, 4)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-2c', 'SJC', 'Vàng SJC 2 chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.5 Vàng nhẫn SJC 9999 (1 chỉ, 2 chỉ, 5 chỉ)
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'NHAN_9999_CHI', 'Vàng nhẫn SJC 99,99 1c, 2c, 5c', true, 10)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  -- SJC Crawler Mapping
  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Vàng nhẫn SJC 99,99 1 chỉ, 2 chỉ, 5 chỉ', 'SJC', 'Vàng nhẫn SJC 99,99 1c, 2c, 5c', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- Onus Crawler Mapping
  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-sjc-9999-1-chi-2-chi-5-chi', 'SJC', 'Vàng nhẫn SJC 99,99 1c, 2c, 5c', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.6 Vàng nhẫn SJC 9999 (0.3 chỉ, 0.5 chỉ)
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'NHAN_9999_PHAN', 'Vàng nhẫn SJC 99,99 (0.5 chỉ)', true, 11)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  -- SJC Crawler Mapping
  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Vàng nhẫn SJC 99,99 0.5 chỉ', 'SJC', 'Vàng nhẫn SJC 99,99 (0.5 chỉ)', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- Onus Crawler Mapping
  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-sjc-9999-03-chi-05-chi', 'SJC', 'Vàng nhẫn SJC 99,99 (0.5 chỉ)', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.7 Nữ trang 99.99%
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'NU_TRANG_9999', 'Nữ trang 99.99%', true, 20)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Nữ trang 99.99%', 'SJC', 'Nữ trang 99.99%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-9999', 'SJC', 'Nữ trang 99.99%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.8 Nữ trang 99%
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'NU_TRANG_99', 'Nữ trang 99%', true, 21)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Nữ trang 99%', 'SJC', 'Nữ trang 99%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-99', 'SJC', 'Nữ trang 99%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

   -- 1.9 Nữ trang 68%
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'NU_TRANG_68', 'Nữ trang 68%', true, 22)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Nữ trang 68%', 'SJC', 'Nữ trang 68%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-68', 'SJC', 'Nữ trang 68%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- 1.10 Nữ trang 41.7%
  INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
  VALUES ('SJC', 'NU_TRANG_417', 'Nữ trang 41.7%', true, 23)
  ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
  RETURNING id INTO product_id;

  IF sjc_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (sjc_source_id, 'Nữ trang 41,7%', 'SJC', 'Nữ trang 41.7%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  IF onus_source_id IS NOT NULL THEN
    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-417', 'SJC', 'Nữ trang 41.7%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- ============================================================================
  -- 2. PNJ PRODUCTS (From Onus Source)
  -- ============================================================================
  
  IF onus_source_id IS NOT NULL THEN
    -- Vàng miếng SJC PNJ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'MIENG_SJC', 'Vàng miếng SJC PNJ', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-sjc-9999-00', 'PNJ', 'Vàng miếng SJC PNJ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn trơn 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'NHAN_TRON_9999', 'Vàng nhẫn trơn 9999', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nhan-tron-pnj-9999-00', 'PNJ', 'Vàng nhẫn trơn 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng Kim Bảo 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'KIM_BAO_9999', 'Vàng Kim Bảo 9999', true, 2)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-kim-bao-9999-00', 'PNJ', 'Vàng Kim Bảo 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng miếng PNJ - Phượng Hoàng
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'MIENG_PHUONG_HOANG', 'Vàng miếng PNJ - Phượng Hoàng', true, 3)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-phuong-hoang-9999-00', 'PNJ', 'Vàng miếng PNJ - Phượng Hoàng', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 24K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_24K', 'Vàng 24K', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-24k', 'PNJ', 'Vàng 24K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 18K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_18K', 'Vàng 18K', true, 21)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-18k', 'PNJ', 'Vàng 18K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 14K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_14K', 'Vàng 14K', true, 22)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-14k', 'PNJ', 'Vàng 14K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 10K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_10K', 'Vàng 10K', true, 23)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-10k', 'PNJ', 'Vàng 10K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Bạc
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'BAC', 'Bạc', true, 30)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'bac', 'PNJ', 'Bạc', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng Phúc Lộc Tài 99.99
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('PNJ', 'PHUC_LOC_TAI_9999', 'Vàng Phúc Lộc Tài 99.99', true, 40)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-phuc-loc-tai-9999-00', 'PNJ', 'Vàng Phúc Lộc Tài 99.99', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- ============================================================================
  -- 3. DOJI PRODUCTS (From Onus Source)
  -- ============================================================================
  
  IF onus_source_id IS NOT NULL THEN
    -- Vàng miếng DOJI lẻ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('DOJI', 'MIENG_LE', 'Vàng miếng DOJI lẻ', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-doji-le', 'DOJI', 'Vàng miếng DOJI lẻ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng miếng DOJI thanh (1-5 chỉ)
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('DOJI', 'MIENG_THANH_1_5C', 'Vàng miếng DOJI thanh (1-5 chỉ)', true, 2)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-doji-thanh-1-5-chi', 'DOJI', 'Vàng miếng DOJI thanh (1-5 chỉ)', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Nhẫn Tròn 9999 Hưng Thịnh Vượng
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('DOJI', 'NHAN_HUNG_THINH_VUONG', 'Nhẫn Tròn 9999 Hưng Thịnh Vượng', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nhan-tron-9999-hung-thinh-vuong', 'DOJI', 'Nhẫn Tròn 9999 Hưng Thịnh Vượng', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Nữ trang 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('DOJI', 'NU_TRANG_9999', 'Nữ trang 9999', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-9999', 'DOJI', 'Nữ trang 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng Ngoại tệ 99.99
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('DOJI', 'NGOAI_TE_9999', 'Vàng Ngoại tệ 99.99', true, 3)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-ngoai-te-9999', 'DOJI', 'Vàng Ngoại tệ 99.99', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;

  -- ============================================================================
  -- 4. BẢO TÍN MINH CHÂU PRODUCTS (From Onus Source)
  -- ============================================================================
  
  IF onus_source_id IS NOT NULL THEN
    -- Vàng miếng SJC
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'MIENG_SJC', 'Vàng miếng SJC', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-sjc', 'Bảo Tín Minh Châu', 'Vàng miếng SJC', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 9999 - HCM
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_9999_HCM', 'Vàng nữ trang 9999 - HCM', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-9999-hcm', 'Bảo Tín Minh Châu', 'Vàng nữ trang 9999 - HCM', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 9999 - HN
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_9999_HN', 'Vàng nữ trang 9999 - HN', true, 11)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-9999-hn', 'Bảo Tín Minh Châu', 'Vàng nữ trang 9999 - HN', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn trơn 9999 - HCM
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NHAN_TRON_9999_HCM', 'Vàng nhẫn trơn 9999 - HCM', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-tron-9999-hcm', 'Bảo Tín Minh Châu', 'Vàng nhẫn trơn 9999 - HCM', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn trơn 9999 - HN
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NHAN_TRON_9999_HN', 'Vàng nhẫn trơn 9999 - HN', true, 21)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-tron-9999-hn', 'Bảo Tín Minh Châu', 'Vàng nhẫn trơn 9999 - HN', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 99 - HCM
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_99_HCM', 'Vàng nữ trang 99 - HCM', true, 12)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-99-hcm', 'Bảo Tín Minh Châu', 'Vàng nữ trang 99 - HCM', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 99 - HN
    INSERT INTO retailer_products (retailer_code, product_code, product_name, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_99_HN', 'Vàng nữ trang 99 - HN', true, 13)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-99-hn', 'Bảo Tín Minh Châu', 'Vàng nữ trang 99 - HN', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;
  END IF;
END $$;
