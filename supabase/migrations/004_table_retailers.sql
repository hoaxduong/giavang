-- Retailers table
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retailers_enabled ON retailers(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_retailers_code ON retailers(code);

-- RLS
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled retailers" ON retailers FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage retailers" ON retailers FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_retailers_updated_at ON retailers;
CREATE TRIGGER update_retailers_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE retailers IS 'Gold retailers reference data';
