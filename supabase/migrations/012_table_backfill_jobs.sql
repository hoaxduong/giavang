-- Backfill jobs table
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

-- RLS
ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backfill jobs" ON backfill_jobs FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_backfill_jobs_updated_at ON backfill_jobs;
CREATE TRIGGER update_backfill_jobs_updated_at
  BEFORE UPDATE ON backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE backfill_jobs IS 'Tracks historical data backfill job execution and progress';
COMMENT ON COLUMN backfill_jobs.job_type IS 'Type of backfill: full_historical, date_range';
COMMENT ON COLUMN backfill_jobs.status IS 'Job status: pending, running, paused, completed, partial_success, failed, cancelled';
COMMENT ON COLUMN backfill_jobs.config IS 'JSON configuration specific to job type';
COMMENT ON COLUMN backfill_jobs.checkpoint_data IS 'Checkpoint data for resume capability';
COMMENT ON COLUMN backfill_jobs.failed_items IS 'Array of failed items with error details';
