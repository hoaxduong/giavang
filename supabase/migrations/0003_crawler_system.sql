-- 0003_crawler_system.sql
-- Web crawler and data collection system

-- 1. Crawler Sources
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
ALTER TABLE crawler_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled crawler sources" ON crawler_sources FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage crawler sources" ON crawler_sources FOR ALL USING (public.is_admin());

-- 2. Crawler Type Mappings (Final schema without province_code)
CREATE TABLE IF NOT EXISTS crawler_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawler_sources(id) ON DELETE CASCADE,
  external_code VARCHAR(100) NOT NULL,
  retailer_code VARCHAR(50) NOT NULL,
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
ALTER TABLE crawler_type_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled type mappings" ON crawler_type_mappings FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage type mappings" ON crawler_type_mappings FOR ALL USING (public.is_admin());

-- 3. Crawler Logs
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
ALTER TABLE crawler_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read crawler logs" ON crawler_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert crawler logs" ON crawler_logs FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NULL);

-- 4. Backfill Jobs
CREATE TABLE IF NOT EXISTS backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL,
  source_id UUID REFERENCES crawler_sources(id) ON DELETE SET NULL,
  config JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  progress_percent INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  failed_items JSONB,
  checkpoint_data JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status ON backfill_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_source ON backfill_jobs(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_created_by ON backfill_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_type ON backfill_jobs(job_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_backfill_jobs_active_source ON backfill_jobs(source_id) WHERE status IN ('pending', 'running', 'paused');
ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage backfill jobs" ON backfill_jobs FOR ALL USING (public.is_admin());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply update_updated_at triggers to crawler tables
CREATE TRIGGER update_crawler_sources_updated_at BEFORE UPDATE ON crawler_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crawler_type_mappings_updated_at BEFORE UPDATE ON crawler_type_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_backfill_jobs_updated_at BEFORE UPDATE ON backfill_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

