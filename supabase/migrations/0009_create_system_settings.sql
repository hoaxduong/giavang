-- 0009_create_system_settings.sql

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/edit settings
CREATE POLICY "Admins can view system settings" 
ON system_settings FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update system settings" 
ON system_settings FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can insert system settings" 
ON system_settings FOR INSERT 
WITH CHECK (public.is_admin());

-- Insert default settings for AI if strictly necessary, but better to let UI handle it.
-- Pre-seeding empty config structure
INSERT INTO system_settings (key, value, description)
VALUES 
  ('ai_config', '{"provider": "google", "apiKey": ""}'::jsonb, 'AI Provider Configuration')
ON CONFLICT (key) DO NOTHING;
