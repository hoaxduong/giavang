-- Backfill job logs table
CREATE TABLE IF NOT EXISTS backfill_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES backfill_jobs(id) ON DELETE CASCADE,
  log_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backfill_job_logs_job ON backfill_job_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_job_logs_level ON backfill_job_logs(log_level, created_at DESC);

-- RLS
ALTER TABLE backfill_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backfill logs" ON backfill_job_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Service role can insert backfill logs" ON backfill_job_logs FOR INSERT WITH CHECK (true);

COMMENT ON TABLE backfill_job_logs IS 'Detailed logs for backfill jobs for debugging and monitoring';
