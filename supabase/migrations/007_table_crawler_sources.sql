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
  field_mappings JSONB DEFAULT '{}'::jsonb,
  retailer_filter JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawler_sources_enabled ON crawler_sources(is_enabled, priority);
CREATE INDEX IF NOT EXISTS idx_crawler_sources_name ON crawler_sources(name);

-- RLS
ALTER TABLE crawler_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled crawler sources" ON crawler_sources FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage crawler sources" ON crawler_sources FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_crawler_sources_updated_at ON crawler_sources;
CREATE TRIGGER update_crawler_sources_updated_at
  BEFORE UPDATE ON crawler_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE crawler_sources IS 'External API sources for price data collection';
COMMENT ON COLUMN crawler_sources.api_type IS 'Type of crawler: vang_today, goldapi, custom, etc.';
COMMENT ON COLUMN crawler_sources.auth_type IS 'Authentication type: none, bearer, api_key, basic';
COMMENT ON COLUMN crawler_sources.priority IS 'Lower number = higher priority when syncing multiple sources';
COMMENT ON COLUMN crawler_sources.field_mappings IS 'Configuration for parsing and mapping API response fields';
COMMENT ON COLUMN crawler_sources.retailer_filter IS 'Optional retailer filter: null = all retailers, ["SJC", "PNJ"] = specific retailers';
