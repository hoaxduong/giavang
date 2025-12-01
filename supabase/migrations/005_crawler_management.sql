-- Crawler Management System
-- Adds tables for managing multiple crawler sources, reference data, type mappings, and logs

-- ============================================================================
-- REFERENCE DATA TABLES (migrating from constants)
-- ============================================================================

-- Retailers table
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retailers_enabled ON retailers(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_retailers_code ON retailers(code);

-- Provinces table
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provinces_enabled ON provinces(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_provinces_code ON provinces(code);

-- Product types table
CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  short_label VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_types_enabled ON product_types(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_types_code ON product_types(code);

-- ============================================================================
-- CRAWLER MANAGEMENT TABLES
-- ============================================================================

-- Crawler sources table
CREATE TABLE IF NOT EXISTS crawler_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  api_url TEXT NOT NULL,
  api_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}',
  auth_type VARCHAR(50),
  auth_config JSONB,
  rate_limit_per_minute INTEGER DEFAULT 60,
  timeout_seconds INTEGER DEFAULT 30,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawler_sources_enabled ON crawler_sources(is_enabled, priority);
CREATE INDEX IF NOT EXISTS idx_crawler_sources_name ON crawler_sources(name);

-- Crawler type mappings table
CREATE TABLE IF NOT EXISTS crawler_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawler_sources(id) ON DELETE CASCADE,
  external_code VARCHAR(100) NOT NULL,
  retailer_code VARCHAR(50) NOT NULL,
  product_type_code VARCHAR(50) NOT NULL,
  province_code VARCHAR(50),
  label VARCHAR(200) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, external_code)
);

CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_source ON crawler_type_mappings(source_id, external_code, is_enabled);
CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_enabled ON crawler_type_mappings(is_enabled);
CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_retailer ON crawler_type_mappings(retailer_code);

-- Crawler logs table
CREATE TABLE IF NOT EXISTS crawler_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES crawler_sources(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  records_fetched INTEGER DEFAULT 0,
  records_saved INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  request_url TEXT,
  request_method VARCHAR(10) DEFAULT 'GET',
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  failed_items JSONB,
  trigger_type VARCHAR(50),
  trigger_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawler_logs_source ON crawler_logs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_status ON crawler_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_date ON crawler_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_trigger ON crawler_logs(trigger_type, started_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled reference data
CREATE POLICY "Public can read enabled retailers"
  ON retailers FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Public can read enabled provinces"
  ON provinces FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Public can read enabled product types"
  ON product_types FOR SELECT
  USING (is_enabled = true);

-- Admin-only write access for reference data
CREATE POLICY "Admins can manage retailers"
  ON retailers FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage provinces"
  ON provinces FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage product types"
  ON product_types FOR ALL
  USING (public.is_admin());

-- Public read access for enabled crawler sources (for displaying available sources)
CREATE POLICY "Public can read enabled crawler sources"
  ON crawler_sources FOR SELECT
  USING (is_enabled = true);

-- Admin-only management for crawler sources
CREATE POLICY "Admins can manage crawler sources"
  ON crawler_sources FOR ALL
  USING (public.is_admin());

-- Public read access for enabled type mappings
CREATE POLICY "Public can read enabled type mappings"
  ON crawler_type_mappings FOR SELECT
  USING (is_enabled = true);

-- Admin-only management for type mappings
CREATE POLICY "Admins can manage type mappings"
  ON crawler_type_mappings FOR ALL
  USING (public.is_admin());

-- Admin-only read access for crawler logs
CREATE POLICY "Admins can read crawler logs"
  ON crawler_logs FOR SELECT
  USING (public.is_admin());

-- Admin-only insert for crawler logs (crawler system writes logs)
CREATE POLICY "Admins can insert crawler logs"
  ON crawler_logs FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() IS NULL);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_retailers_updated_at ON retailers;
CREATE TRIGGER update_retailers_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_provinces_updated_at ON provinces;
CREATE TRIGGER update_provinces_updated_at
  BEFORE UPDATE ON provinces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_types_updated_at ON product_types;
CREATE TRIGGER update_product_types_updated_at
  BEFORE UPDATE ON product_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crawler_sources_updated_at ON crawler_sources;
CREATE TRIGGER update_crawler_sources_updated_at
  BEFORE UPDATE ON crawler_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crawler_type_mappings_updated_at ON crawler_type_mappings;
CREATE TRIGGER update_crawler_type_mappings_updated_at
  BEFORE UPDATE ON crawler_type_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SEED DATA - RETAILERS
-- ============================================================================

INSERT INTO retailers (code, name, sort_order) VALUES
  ('SJC', 'SJC', 1),
  ('DOJI', 'DOJI', 2),
  ('PNJ', 'PNJ', 3),
  ('Bảo Tín Minh Châu', 'Bảo Tín Minh Châu', 4),
  ('Phú Quý', 'Phú Quý', 5),
  ('Bảo Tín Phú Khương', 'Bảo Tín Phú Khương', 6),
  ('Mi Hồng', 'Mi Hồng', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA - PROVINCES
-- ============================================================================

INSERT INTO provinces (code, name, sort_order) VALUES
  ('TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 1),
  ('Hà Nội', 'Hà Nội', 2),
  ('Đà Nẵng', 'Đà Nẵng', 3),
  ('Cần Thơ', 'Cần Thơ', 4),
  ('Hải Phòng', 'Hải Phòng', 5),
  ('Biên Hòa', 'Biên Hòa', 6),
  ('Nha Trang', 'Nha Trang', 7),
  ('Huế', 'Huế', 8),
  ('Vũng Tàu', 'Vũng Tàu', 9),
  ('Buôn Ma Thuột', 'Buôn Ma Thuột', 10),
  ('Quy Nhơn', 'Quy Nhơn', 11),
  ('Thái Nguyên', 'Thái Nguyên', 12)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA - PRODUCT TYPES
-- ============================================================================

INSERT INTO product_types (code, label, short_label, sort_order) VALUES
  ('SJC_BARS', 'Vàng miếng SJC', 'Miếng SJC', 1),
  ('SJC_RINGS', 'Vàng nhẫn SJC', 'Nhẫn SJC', 2),
  ('GOLD_9999', 'Vàng 9999', '9999', 3),
  ('GOLD_999', 'Vàng 999', '999', 4),
  ('GOLD_24K', 'Vàng 24K', '24K', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA - DEFAULT CRAWLER SOURCE (vang.today)
-- ============================================================================

INSERT INTO crawler_sources (name, api_url, api_type, is_enabled, priority)
VALUES ('vang.today', 'https://www.vang.today/api/prices', 'vang_today', true, 1)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA - TYPE MAPPINGS (from existing TYPE_CODE_MAPPING)
-- ============================================================================

-- Get the vang.today source ID for mappings
DO $$
DECLARE
  source_uuid UUID;
BEGIN
  SELECT id INTO source_uuid FROM crawler_sources WHERE name = 'vang.today';

  -- World gold (XAU/USD)
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'XAUUSD', 'SJC', 'GOLD_9999', 'TP. Hồ Chí Minh', 'Vàng Thế Giới (XAU/USD)', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- SJC Bars
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'SJL1L10', 'SJC', 'SJC_BARS', 'TP. Hồ Chí Minh', 'Vàng SJC 1 lượng 10 chỉ', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- SJC Rings
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'SJ9999', 'SJC', 'SJC_RINGS', 'TP. Hồ Chí Minh', 'Vàng nhẫn SJC 99.99', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- DOJI Hà Nội
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'DOHNL', 'DOJI', 'GOLD_9999', 'Hà Nội', 'DOJI Hà Nội', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- DOJI HCM
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'DOHCML', 'DOJI', 'GOLD_9999', 'TP. Hồ Chí Minh', 'DOJI HCM', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- DOJI Jewelry
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'DOJINHTV', 'DOJI', 'GOLD_9999', 'TP. Hồ Chí Minh', 'DOJI Nữ Trang', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- Bảo Tín Minh Châu SJC
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'BTSJC', 'Bảo Tín Minh Châu', 'SJC_BARS', 'TP. Hồ Chí Minh', 'Bảo Tín SJC', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- Bảo Tín Minh Châu 9999
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'BT9999NTT', 'Bảo Tín Minh Châu', 'GOLD_9999', 'TP. Hồ Chí Minh', 'Bảo Tín 9999', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- PNJ Hà Nội
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'PQHNVM', 'PNJ', 'SJC_BARS', 'Hà Nội', 'PNJ Hà Nội', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- PNJ 24K
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'PQHN24NTT', 'PNJ', 'GOLD_24K', 'Hà Nội', 'PNJ 24K', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- VN Gold SJC
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'VNGSJC', 'SJC', 'SJC_BARS', 'TP. Hồ Chí Minh', 'VN Gold SJC', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- Viettin SJC
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'VIETTINMSJC', 'SJC', 'SJC_BARS', 'TP. Hồ Chí Minh', 'Viettin SJC', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  -- Legacy mappings for backward compatibility
  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'SJHNL1L10', 'SJC', 'SJC_BARS', 'Hà Nội', 'Vàng SJC HN 1 lượng', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'DOJI9999', 'DOJI', 'GOLD_9999', 'TP. Hồ Chí Minh', 'Vàng DOJI 99.99', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'PNJL1L10', 'PNJ', 'SJC_BARS', 'TP. Hồ Chí Minh', 'Vàng PNJ 1 lượng', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'PNJ9999', 'PNJ', 'GOLD_9999', 'TP. Hồ Chí Minh', 'Vàng PNJ 99.99', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

  INSERT INTO crawler_type_mappings (source_id, external_code, retailer_code, product_type_code, province_code, label, is_enabled)
  VALUES (source_uuid, 'BTMC9999', 'Bảo Tín Minh Châu', 'GOLD_9999', 'TP. Hồ Chí Minh', 'Vàng Bảo Tín Minh Châu 99.99', true)
  ON CONFLICT (source_id, external_code) DO NOTHING;

END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE retailers IS 'Gold retailers reference data (migrated from constants)';
COMMENT ON TABLE provinces IS 'Vietnamese provinces and cities reference data';
COMMENT ON TABLE product_types IS 'Gold product types reference data';
COMMENT ON TABLE crawler_sources IS 'External API sources for price data collection';
COMMENT ON TABLE crawler_type_mappings IS 'Maps external API type codes to internal entities';
COMMENT ON TABLE crawler_logs IS 'Comprehensive logging for all crawler sync operations';

COMMENT ON COLUMN crawler_sources.api_type IS 'Type of crawler: vang_today, goldapi, custom, etc.';
COMMENT ON COLUMN crawler_sources.auth_type IS 'Authentication type: none, bearer, api_key, basic';
COMMENT ON COLUMN crawler_sources.priority IS 'Lower number = higher priority when syncing multiple sources';
COMMENT ON COLUMN crawler_logs.status IS 'Sync status: running, success, partial_success, failed';
COMMENT ON COLUMN crawler_logs.trigger_type IS 'How sync was triggered: manual, cron, api';
