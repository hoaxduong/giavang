-- Historical Data Backfill System
-- Adds tables for managing backfill jobs, job logs, and tracking backfilled data

-- ============================================================================
-- BACKFILL JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job configuration
  job_type VARCHAR(50) NOT NULL,  -- 'full_historical' or 'date_range'
  source_id UUID REFERENCES crawler_sources(id) ON DELETE SET NULL,
  config JSONB NOT NULL,
  /*
    For full_historical: { days: 30, types: 'all' | ['SJL1L10', ...] }
    For date_range: { startDate: '2025-11-01', endDate: '2025-11-30', types: 'all' | [...] }
  */

  -- Job status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status values: pending, running, paused, completed, partial_success, failed, cancelled
  progress_percent INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Statistics
  total_items INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  failed_items JSONB,  -- Array of {type, date, error}

  -- Checkpoint/resume support
  checkpoint_data JSONB,  -- {currentTypeIndex, currentDateIndex, lastSuccessfulType, lastSuccessfulDate}

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status ON backfill_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_source ON backfill_jobs(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_created_by ON backfill_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_type ON backfill_jobs(job_type, status);

-- Prevent concurrent jobs for same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_backfill_jobs_active_source
ON backfill_jobs(source_id)
WHERE status IN ('pending', 'running', 'paused');

-- ============================================================================
-- BACKFILL JOB LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS backfill_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES backfill_jobs(id) ON DELETE CASCADE,

  log_level VARCHAR(20) NOT NULL,  -- info, warning, error
  message TEXT NOT NULL,
  details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backfill_job_logs_job ON backfill_job_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_job_logs_level ON backfill_job_logs(log_level, created_at DESC);

-- ============================================================================
-- PRICE SNAPSHOTS EXTENSIONS
-- ============================================================================

-- Add columns to track backfilled data
ALTER TABLE price_snapshots
ADD COLUMN IF NOT EXISTS source_job_id UUID REFERENCES backfill_jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_backfilled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_job ON price_snapshots(source_job_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_backfilled ON price_snapshots(is_backfilled, created_at DESC);

-- Deduplication constraint (day-level) for backfilled data
-- Only enforce uniqueness on backfilled data to avoid conflicts with real-time syncs
-- Using explicit date cast which is IMMUTABLE
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_daily_unique ON price_snapshots(
  retailer,
  province,
  product_type,
  ((created_at AT TIME ZONE 'UTC')::date)
) WHERE is_backfilled = true;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backfill_job_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage backfill jobs
CREATE POLICY "Admins can manage backfill jobs"
  ON backfill_jobs FOR ALL
  USING (public.is_admin());

-- Admins can view backfill logs
CREATE POLICY "Admins can view backfill logs"
  ON backfill_job_logs FOR SELECT
  USING (public.is_admin());

-- Service role can insert backfill logs (for internal job execution)
CREATE POLICY "Service role can insert backfill logs"
  ON backfill_job_logs FOR INSERT
  WITH CHECK (true);  -- Allow service role

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_backfill_jobs_updated_at ON backfill_jobs;
CREATE TRIGGER update_backfill_jobs_updated_at
  BEFORE UPDATE ON backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE backfill_jobs IS 'Tracks historical data backfill job execution and progress';
COMMENT ON TABLE backfill_job_logs IS 'Detailed logs for backfill jobs for debugging and monitoring';

COMMENT ON COLUMN backfill_jobs.job_type IS 'Type of backfill: full_historical, date_range';
COMMENT ON COLUMN backfill_jobs.status IS 'Job status: pending, running, paused, completed, partial_success, failed, cancelled';
COMMENT ON COLUMN backfill_jobs.config IS 'JSON configuration specific to job type';
COMMENT ON COLUMN backfill_jobs.checkpoint_data IS 'Checkpoint data for resume capability';
COMMENT ON COLUMN backfill_jobs.failed_items IS 'Array of failed items with error details';
COMMENT ON COLUMN price_snapshots.source_job_id IS 'References the backfill job that created this snapshot';
COMMENT ON COLUMN price_snapshots.is_backfilled IS 'True if this snapshot was created by a backfill job';
