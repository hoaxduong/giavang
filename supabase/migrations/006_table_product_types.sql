-- Product types table
CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  short_label VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_types_enabled ON product_types(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_types_code ON product_types(code);

-- RLS
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled product types" ON product_types FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage product types" ON product_types FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_product_types_updated_at ON product_types;
CREATE TRIGGER update_product_types_updated_at
  BEFORE UPDATE ON product_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE product_types IS 'Gold product types reference data';
