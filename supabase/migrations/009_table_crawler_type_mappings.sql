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
  retailer_product_id UUID REFERENCES retailer_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, external_code)
);

CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_source ON crawler_type_mappings(source_id, external_code, is_enabled);
CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_enabled ON crawler_type_mappings(is_enabled);
CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_retailer ON crawler_type_mappings(retailer_code);
CREATE INDEX IF NOT EXISTS idx_type_mappings_retailer_product ON crawler_type_mappings(retailer_product_id);

-- RLS
ALTER TABLE crawler_type_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled type mappings" ON crawler_type_mappings FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage type mappings" ON crawler_type_mappings FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_crawler_type_mappings_updated_at ON crawler_type_mappings;
CREATE TRIGGER update_crawler_type_mappings_updated_at
  BEFORE UPDATE ON crawler_type_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE crawler_type_mappings IS 'Maps external API type codes to internal entities';
COMMENT ON COLUMN crawler_type_mappings.retailer_product_id IS 'Link to retailer-specific product';
