-- Provinces table
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provinces_enabled ON provinces(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_provinces_code ON provinces(code);

-- RLS
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled provinces" ON provinces FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage provinces" ON provinces FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_provinces_updated_at ON provinces;
CREATE TRIGGER update_provinces_updated_at
  BEFORE UPDATE ON provinces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE provinces IS 'Vietnamese provinces and cities reference data';
