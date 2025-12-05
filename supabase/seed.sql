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
-- PRODUCT TYPES
-- ============================================================================

INSERT INTO product_types (code, label, short_label, sort_order, is_enabled) VALUES
  ('VANG_MIENG', 'Vàng miếng', 'Miếng', 1, true),
  ('VANG_NHAN', 'Vàng nhẫn', 'Nhẫn', 2, true),
  ('NU_TRANG', 'Nữ trang', 'Trang sức', 3, true),
  ('VANG_KHAC', 'Vàng khác', 'Khác', 4, true),
  ('BAC', 'Bạc', 'Silver', 5, true),
  ('SJC_BARS', 'Vàng miếng SJC', 'Miếng SJC', 101, true),
  ('SJC_RINGS', 'Vàng nhẫn SJC', 'Nhẫn SJC', 102, true),
  ('GOLD_9999', 'Vàng 9999', '9999', 103, true),
  ('GOLD_999', 'Vàng 999', '999', 104, true),
  ('GOLD_24K', 'Vàng 24K', '24K', 105, true)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  short_label = EXCLUDED.short_label,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled;

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
-- SJC TYPE MAPPINGS
-- ============================================================================

DO $$
DECLARE
  sjc_source_id UUID;
  gold_bar_product_type_code VARCHAR;
  product_id UUID;
BEGIN
  -- Get SJC source ID
  SELECT id INTO sjc_source_id
  FROM crawler_sources
  WHERE api_type = 'sjc';

  IF sjc_source_id IS NOT NULL THEN
    -- Get the gold bar product type code
    SELECT code INTO gold_bar_product_type_code
    FROM product_types
    WHERE code IN ('VANG_MIENG', 'SJC_GOLD_BAR', 'GOLD_BAR')
    ORDER BY CASE code
      WHEN 'VANG_MIENG' THEN 1
      ELSE 2
    END
    LIMIT 1;

    -- Create or get retailer product for SJC Bars
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'MIENG_1L_10L_1KG', 'Vàng SJC 1L, 10L, 1KG', 'vang_mieng', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    -- Insert type mappings
    INSERT INTO crawler_type_mappings (
      source_id,
      external_code,
      retailer_code,
      product_type_code,
      province_code,
      label,
      is_enabled,
      retailer_product_id
    ) VALUES
      (
        sjc_source_id,
        'Vàng SJC 1L, 10L, 1KG',
        'SJC',
        COALESCE(gold_bar_product_type_code, 'VANG_MIENG'),
        NULL,
        'SJC Gold Bars (1L, 10L, 1KG)',
        true,
        product_id
      )
    ON CONFLICT (source_id, external_code) DO UPDATE
    SET
      retailer_code = EXCLUDED.retailer_code,
      product_type_code = EXCLUDED.product_type_code,
      label = EXCLUDED.label,
      is_enabled = EXCLUDED.is_enabled,
      retailer_product_id = EXCLUDED.retailer_product_id;
  END IF;
END $$;

-- ============================================================================
-- ONUS RETAILER PRODUCTS & MAPPINGS
-- ============================================================================

DO $$
DECLARE
  onus_source_id UUID;
  product_id UUID;
BEGIN
  -- Get Onus source ID
  SELECT id INTO onus_source_id
  FROM crawler_sources
  WHERE api_type = 'onus'
  LIMIT 1;

  IF onus_source_id IS NOT NULL THEN
    -- ===== SJC Products =====

    -- Vàng miếng SJC theo lượng
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'MIENG_1L', 'Vàng miếng SJC theo lượng', 'vang_mieng', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-1l-10l-1kg', 'SJC', 'VANG_MIENG', NULL, 'Vàng miếng SJC theo lượng', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng SJC 5 chỉ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'MIENG_5C', 'Vàng SJC 5 chỉ', 'vang_mieng', true, 2)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-5c', 'SJC', 'VANG_MIENG', NULL, 'Vàng SJC 5 chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng SJC 1 chỉ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'MIENG_1C', 'Vàng SJC 1 chỉ', 'vang_mieng', true, 3)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-2c-1c-5-phan', 'SJC', 'VANG_MIENG', NULL, 'Vàng SJC 1 chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng SJC 2 chỉ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'MIENG_2C', 'Vàng SJC 2 chỉ', 'vang_mieng', true, 4)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'sjc-2c', 'SJC', 'VANG_MIENG', NULL, 'Vàng SJC 2 chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn SJC 9999 theo chỉ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'NHAN_9999_CHI', 'Vàng nhẫn SJC 9999 theo chỉ', 'vang_nhan', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-sjc-9999-1-chi-2-chi-5-chi', 'SJC', 'VANG_NHAN', NULL, 'Vàng nhẫn SJC 9999 theo chỉ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn SJC 9999 theo phân
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'NHAN_9999_PHAN', 'Vàng nhẫn SJC 9999 theo phân', 'vang_nhan', true, 11)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-sjc-9999-03-chi-05-chi', 'SJC', 'VANG_NHAN', NULL, 'Vàng nhẫn SJC 9999 theo phân', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Trang sức vàng SJC 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'NU_TRANG_9999', 'Trang sức vàng SJC 9999', 'nu_trang', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-9999', 'SJC', 'NU_TRANG', NULL, 'Trang sức vàng SJC 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng trang sức SJC 99%
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'NU_TRANG_99', 'Vàng trang sức SJC 99%', 'nu_trang', true, 21)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-99', 'SJC', 'NU_TRANG', NULL, 'Vàng trang sức SJC 99%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Nữ trang 68%
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'NU_TRANG_68', 'Nữ trang 68%', 'nu_trang', true, 22)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-68', 'SJC', 'NU_TRANG', NULL, 'Nữ trang 68%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Nữ trang 41,7%
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('SJC', 'NU_TRANG_417', 'Nữ trang 41,7%', 'nu_trang', true, 23)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-417', 'SJC', 'NU_TRANG', NULL, 'Nữ trang 41,7%', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- ===== PNJ Products =====

    -- Vàng miếng SJC PNJ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'MIENG_SJC', 'Vàng miếng SJC PNJ', 'vang_mieng', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-sjc-9999-00', 'PNJ', 'VANG_MIENG', NULL, 'Vàng miếng SJC PNJ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn trơn 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'NHAN_TRON_9999', 'Vàng nhẫn trơn 9999', 'vang_nhan', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nhan-tron-pnj-9999-00', 'PNJ', 'VANG_NHAN', NULL, 'Vàng nhẫn trơn 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng Kim Bảo 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'KIM_BAO_9999', 'Vàng Kim Bảo 9999', 'vang_mieng', true, 2)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-kim-bao-9999-00', 'PNJ', 'VANG_MIENG', NULL, 'Vàng Kim Bảo 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng miếng PNJ - Phượng Hoàng
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'MIENG_PHUONG_HOANG', 'Vàng miếng PNJ - Phượng Hoàng', 'vang_mieng', true, 3)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-phuong-hoang-9999-00', 'PNJ', 'VANG_MIENG', NULL, 'Vàng miếng PNJ - Phượng Hoàng', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 24K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_24K', 'Vàng 24K', 'nu_trang', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-24k', 'PNJ', 'NU_TRANG', NULL, 'Vàng 24K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 18K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_18K', 'Vàng 18K', 'nu_trang', true, 21)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-18k', 'PNJ', 'NU_TRANG', NULL, 'Vàng 18K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 14K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_14K', 'Vàng 14K', 'nu_trang', true, 22)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-14k', 'PNJ', 'NU_TRANG', NULL, 'Vàng 14K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng 10K
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'VANG_10K', 'Vàng 10K', 'nu_trang', true, 23)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-10k', 'PNJ', 'NU_TRANG', NULL, 'Vàng 10K', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Bạc
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('PNJ', 'BAC', 'Bạc', 'bac', true, 30)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'bac', 'PNJ', 'BAC', NULL, 'Bạc', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- ===== DOJI Products =====

    -- Vàng miếng DOJI lẻ
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('DOJI', 'MIENG_LE', 'Vàng miếng DOJI lẻ', 'vang_mieng', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-doji-le', 'DOJI', 'VANG_MIENG', NULL, 'Vàng miếng DOJI lẻ', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng miếng DOJI thanh (1-5 chỉ)
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('DOJI', 'MIENG_THANH_1_5C', 'Vàng miếng DOJI thanh (1-5 chỉ)', 'vang_mieng', true, 2)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-doji-thanh-1-5-chi', 'DOJI', 'VANG_MIENG', NULL, 'Vàng miếng DOJI thanh (1-5 chỉ)', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Nhẫn Tròn 9999 Hưng Thịnh Vượng
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('DOJI', 'NHAN_HUNG_THINH_VUONG', 'Nhẫn Tròn 9999 Hưng Thịnh Vượng', 'vang_nhan', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nhan-tron-9999-hung-thinh-vuong', 'DOJI', 'VANG_NHAN', NULL, 'Nhẫn Tròn 9999 Hưng Thịnh Vượng', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Nữ trang 9999
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('DOJI', 'NU_TRANG_9999', 'Nữ trang 9999', 'nu_trang', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'nu-trang-9999', 'DOJI', 'NU_TRANG', NULL, 'Nữ trang 9999', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng Ngoại tệ 99.99
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('DOJI', 'NGOAI_TE_9999', 'Vàng Ngoại tệ 99.99', 'vang_mieng', true, 3)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-ngoai-te-9999', 'DOJI', 'VANG_MIENG', NULL, 'Vàng Ngoại tệ 99.99', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- ===== Bảo Tín Minh Châu Products =====

    -- Vàng miếng SJC
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'MIENG_SJC', 'Vàng miếng SJC', 'vang_mieng', true, 1)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-mieng-sjc', 'Bảo Tín Minh Châu', 'VANG_MIENG', NULL, 'Vàng miếng SJC', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 9999 - HCM
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_9999_HCM', 'Vàng nữ trang 9999 - HCM', 'nu_trang', true, 10)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-9999-hcm', 'Bảo Tín Minh Châu', 'NU_TRANG', NULL, 'Vàng nữ trang 9999 - HCM', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 9999 - HN
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_9999_HN', 'Vàng nữ trang 9999 - HN', 'nu_trang', true, 11)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-9999-hn', 'Bảo Tín Minh Châu', 'NU_TRANG', NULL, 'Vàng nữ trang 9999 - HN', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn trơn 9999 - HCM
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NHAN_TRON_9999_HCM', 'Vàng nhẫn trơn 9999 - HCM', 'vang_nhan', true, 20)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-tron-9999-hcm', 'Bảo Tín Minh Châu', 'VANG_NHAN', NULL, 'Vàng nhẫn trơn 9999 - HCM', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nhẫn trơn 9999 - HN
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NHAN_TRON_9999_HN', 'Vàng nhẫn trơn 9999 - HN', 'vang_nhan', true, 21)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nhan-tron-9999-hn', 'Bảo Tín Minh Châu', 'VANG_NHAN', NULL, 'Vàng nhẫn trơn 9999 - HN', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 99 - HCM
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_99_HCM', 'Vàng nữ trang 99 - HCM', 'nu_trang', true, 12)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-99-hcm', 'Bảo Tín Minh Châu', 'NU_TRANG', NULL, 'Vàng nữ trang 99 - HCM', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

    -- Vàng nữ trang 99 - HN
    INSERT INTO retailer_products (retailer_code, product_code, product_name, category, is_enabled, sort_order)
    VALUES ('Bảo Tín Minh Châu', 'NU_TRANG_99_HN', 'Vàng nữ trang 99 - HN', 'nu_trang', true, 13)
    ON CONFLICT (retailer_code, product_code) DO UPDATE SET is_enabled = true
    RETURNING id INTO product_id;

    INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, retailer_product_id, is_enabled)
    VALUES (onus_source_id, 'vang-nu-trang-99-hn', 'Bảo Tín Minh Châu', 'NU_TRANG', NULL, 'Vàng nữ trang 99 - HN', product_id, true)
    ON CONFLICT (source_id, external_code) DO UPDATE SET retailer_product_id = product_id;

  END IF;
END $$;
