-- ============================================================================
-- Migration 009: SJC Crawler Setup
-- ============================================================================
-- Adds SJC (Saigon Jewelry Company) as a new crawler data source
-- with required retailers, provinces, and type mappings
-- ============================================================================

-- Step 1: Ensure SJC retailer exists
-- ============================================================================
INSERT INTO retailers (code, name, is_enabled, sort_order, created_at, updated_at)
VALUES ('SJC', 'SJC - Công ty SJC', true, 1, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Step 2: Ensure required provinces exist
-- ============================================================================
INSERT INTO provinces (code, name, is_enabled, sort_order, created_at, updated_at)
VALUES
  ('TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', true, 1, NOW(), NOW()),
  ('Hà Nội', 'Hà Nội', true, 2, NOW(), NOW()),
  ('Hải Phòng', 'Hải Phòng', true, 3, NOW(), NOW()),
  ('Quảng Ninh', 'Quảng Ninh', true, 4, NOW(), NOW()),
  ('Thừa Thiên Huế', 'Thừa Thiên Huế', true, 5, NOW(), NOW()),
  ('Quảng Ngãi', 'Quảng Ngãi', true, 6, NOW(), NOW()),
  ('Khánh Hòa', 'Khánh Hòa', true, 7, NOW(), NOW()),
  ('Đồng Nai', 'Đồng Nai', true, 8, NOW(), NOW()),
  ('Bạc Liêu', 'Bạc Liêu', true, 9, NOW(), NOW()),
  ('Cà Mau', 'Cà Mau', true, 10, NOW(), NOW()),
  ('Đà Nẵng', 'Đà Nẵng', true, 11, NOW(), NOW()),
  ('Cần Thơ', 'Cần Thơ', true, 12, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Step 3: Add SJC crawler source
-- ============================================================================
INSERT INTO crawler_sources (
  name,
  api_url,
  api_type,
  is_enabled,
  rate_limit_per_minute,
  timeout_seconds,
  priority,
  headers,
  field_mappings,
  created_at,
  updated_at
) VALUES (
  'SJC',
  'https://sjc.com.vn/GoldPrice/Services/PriceService.ashx',
  'sjc',
  true,
  60,  -- Conservative rate limit (1 request per second)
  30,
  2,   -- Priority 2 (after vang.today which should be priority 1)
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
  }'::jsonb,
  NOW(),
  NOW()
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
  field_mappings = EXCLUDED.field_mappings,
  updated_at = NOW();

-- Step 4: Add type mappings for SJC gold products
-- ============================================================================
DO $$
DECLARE
  sjc_source_id UUID;
  gold_bar_product_type_code VARCHAR;
BEGIN
  -- Get SJC source ID
  SELECT id INTO sjc_source_id
  FROM crawler_sources
  WHERE api_type = 'sjc';

  IF sjc_source_id IS NULL THEN
    RAISE EXCEPTION 'SJC crawler source not found. Migration failed.';
  END IF;

  -- Get the gold bar product type code
  -- Adjust this query based on your product_types table structure
  SELECT code INTO gold_bar_product_type_code
  FROM product_types
  WHERE code IN ('GOLD_BAR', 'SJC_GOLD_BAR', 'GOLD_BAR_24K')
  ORDER BY CASE code
    WHEN 'SJC_GOLD_BAR' THEN 1
    WHEN 'GOLD_BAR' THEN 2
    ELSE 3
  END
  LIMIT 1;

  -- If no suitable product type exists, use a default
  IF gold_bar_product_type_code IS NULL THEN
    RAISE NOTICE 'No specific gold bar product type found. Using fallback.';
    -- Try to get any enabled product type as fallback
    SELECT code INTO gold_bar_product_type_code
    FROM product_types
    WHERE is_enabled = true
    ORDER BY sort_order
    LIMIT 1;
  END IF;

  IF gold_bar_product_type_code IS NULL THEN
    RAISE EXCEPTION 'No enabled product types found. Please create product types first.';
  END IF;

  -- Insert type mappings for main SJC gold bar products
  INSERT INTO crawler_type_mappings (
    source_id,
    external_code,
    retailer_code,
    product_type_code,
    province_code,
    label,
    is_enabled,
    created_at,
    updated_at
  ) VALUES
    -- Main SJC gold bars (1 lượng, 10 lượng, 1kg)
    (
      sjc_source_id,
      'Vàng SJC 1L, 10L, 1KG',
      'SJC',
      gold_bar_product_type_code,
      NULL,  -- Province derived from BranchName at runtime
      'SJC Gold Bars (1L, 10L, 1KG)',
      true,
      NOW(),
      NOW()
    ),
    -- SJC 5 chỉ bars
    (
      sjc_source_id,
      'Vàng SJC 5 chỉ',
      'SJC',
      gold_bar_product_type_code,
      NULL,
      'SJC Gold Bars (5 chi)',
      true,
      NOW(),
      NOW()
    ),
    -- SJC small bars (0.5, 1, 2 chỉ)
    (
      sjc_source_id,
      'Vàng SJC 0.5 chỉ, 1 chỉ, 2 chỉ',
      'SJC',
      gold_bar_product_type_code,
      NULL,
      'SJC Gold Bars (0.5, 1, 2 chi)',
      true,
      NOW(),
      NOW()
    )
  ON CONFLICT (source_id, external_code) DO UPDATE
  SET
    retailer_code = EXCLUDED.retailer_code,
    product_type_code = EXCLUDED.product_type_code,
    label = EXCLUDED.label,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();

  RAISE NOTICE 'SJC crawler setup completed successfully';
  RAISE NOTICE 'Source ID: %', sjc_source_id;
  RAISE NOTICE 'Product type: %', gold_bar_product_type_code;
  RAISE NOTICE 'Created % type mappings', 3;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify the SJC crawler source was created
DO $$
DECLARE
  sjc_count INTEGER;
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sjc_count
  FROM crawler_sources
  WHERE api_type = 'sjc';

  SELECT COUNT(*) INTO mapping_count
  FROM crawler_type_mappings ctm
  JOIN crawler_sources cs ON ctm.source_id = cs.id
  WHERE cs.api_type = 'sjc';

  IF sjc_count = 0 THEN
    RAISE EXCEPTION 'SJC crawler source was not created';
  END IF;

  IF mapping_count = 0 THEN
    RAISE EXCEPTION 'No type mappings were created for SJC';
  END IF;

  RAISE NOTICE 'Verification passed: SJC crawler source and % type mappings exist', mapping_count;
END $$;
