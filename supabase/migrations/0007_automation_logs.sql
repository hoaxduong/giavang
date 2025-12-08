-- 0007_automation_system.sql
-- Automation and logging

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Policy for reading logs: only admins can read
CREATE POLICY "Admins can view automation logs" ON automation_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy for inserting logs: Admins can insert
CREATE POLICY "Admins can insert automation logs" ON automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
