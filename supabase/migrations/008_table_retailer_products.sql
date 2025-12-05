-- Retailer Products table
CREATE TABLE IF NOT EXISTS retailer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_code VARCHAR(50) NOT NULL REFERENCES retailers(code) ON DELETE CASCADE,
  product_code VARCHAR(100) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT retailer_products_unique_code UNIQUE(retailer_code, product_code)
);

CREATE INDEX IF NOT EXISTS idx_retailer_products_retailer ON retailer_products(retailer_code);
CREATE INDEX IF NOT EXISTS idx_retailer_products_category ON retailer_products(category);
CREATE INDEX IF NOT EXISTS idx_retailer_products_enabled ON retailer_products(is_enabled);
CREATE INDEX IF NOT EXISTS idx_retailer_products_retailer_enabled ON retailer_products(retailer_code, is_enabled);

-- Trigger Function
CREATE OR REPLACE FUNCTION update_retailer_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_retailer_products_updated_at ON retailer_products;
CREATE TRIGGER trigger_retailer_products_updated_at
  BEFORE UPDATE ON retailer_products
  FOR EACH ROW
  EXECUTE FUNCTION update_retailer_products_updated_at();

COMMENT ON TABLE retailer_products IS 'Retailer-specific product catalog. Each retailer manages their own products independently.';
COMMENT ON COLUMN retailer_products.product_code IS 'Unique product code within retailer (e.g., "MIENG_1L", "NHAN_9999")';
COMMENT ON COLUMN retailer_products.product_name IS 'Display name for UI (e.g., "Vàng miếng SJC theo lượng")';
COMMENT ON COLUMN retailer_products.category IS 'Optional category for grouping: vang_mieng, vang_nhan, nu_trang, vang_khac, bac';
