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

-- RLS
ALTER TABLE crawler_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read crawler logs" ON crawler_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert crawler logs" ON crawler_logs FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NULL);

COMMENT ON TABLE crawler_logs IS 'Comprehensive logging for all crawler sync operations';
COMMENT ON COLUMN crawler_logs.status IS 'Sync status: running, success, partial_success, failed';
COMMENT ON COLUMN crawler_logs.trigger_type IS 'How sync was triggered: manual, cron, api';
