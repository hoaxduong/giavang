-- Zone Mappings table
CREATE TABLE IF NOT EXISTS zone_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawler_sources(id) ON DELETE CASCADE,
  zone_text VARCHAR(100) NOT NULL,
  province_code VARCHAR(50) NOT NULL REFERENCES provinces(code),
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT zone_mappings_source_zone_unique UNIQUE(source_id, zone_text)
);

CREATE INDEX IF NOT EXISTS idx_zone_mappings_source_id ON zone_mappings(source_id);
CREATE INDEX IF NOT EXISTS idx_zone_mappings_source_zone ON zone_mappings(source_id, zone_text);
CREATE INDEX IF NOT EXISTS idx_zone_mappings_enabled ON zone_mappings(is_enabled);

-- Trigger Function
CREATE OR REPLACE FUNCTION update_zone_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS zone_mappings_updated_at ON zone_mappings;
CREATE TRIGGER zone_mappings_updated_at
  BEFORE UPDATE ON zone_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_zone_mappings_updated_at();

COMMENT ON TABLE zone_mappings IS 'Maps zone text from API responses to internal province codes';
COMMENT ON COLUMN zone_mappings.zone_text IS 'Zone text from API (e.g., "Hồ Chí Minh", "Hà Nội")';
COMMENT ON COLUMN zone_mappings.province_code IS 'Internal province code (e.g., "TP. Hồ Chí Minh")';
