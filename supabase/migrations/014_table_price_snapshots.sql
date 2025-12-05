-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retailer VARCHAR(50) NOT NULL,
  province VARCHAR(100) NOT NULL,
  product_type VARCHAR(50) NOT NULL,
  buy_price DECIMAL(12, 2) NOT NULL,
  sell_price DECIMAL(12, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'VND/chi',
  source_url TEXT,
  source_job_id UUID REFERENCES backfill_jobs(id) ON DELETE SET NULL,
  is_backfilled BOOLEAN DEFAULT false,
  product_name VARCHAR(200),
  retailer_product_id UUID REFERENCES retailer_products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_created_at ON price_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookup ON price_snapshots(product_type, retailer, province, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_series ON price_snapshots(product_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_job ON price_snapshots(source_job_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_backfilled ON price_snapshots(is_backfilled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_name ON price_snapshots(product_name);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_retailer_product_name ON price_snapshots(retailer, product_name);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_retailer_product ON price_snapshots(retailer_product_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_retailer_product_time ON price_snapshots(retailer_product_id, created_at DESC);

-- Minute-level uniqueness for backfilled data
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_minute_unique ON price_snapshots(
  retailer,
  province,
  product_type,
  (date_trunc('minute', created_at AT TIME ZONE 'UTC'))
) WHERE is_backfilled = true;

-- RLS
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON price_snapshots FOR SELECT USING (true);
CREATE POLICY "Service role can insert" ON price_snapshots FOR INSERT WITH CHECK (true);

-- Trigger Function
CREATE OR REPLACE FUNCTION auto_set_retailer_product_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If retailer_product_id is not set, try to find it from product_name
  IF NEW.retailer_product_id IS NULL AND NEW.product_name IS NOT NULL THEN
    SELECT id INTO NEW.retailer_product_id
    FROM retailer_products
    WHERE retailer_code = NEW.retailer
      AND product_name = NEW.product_name
      AND is_enabled = true
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_auto_set_retailer_product_id ON price_snapshots;
CREATE TRIGGER trigger_auto_set_retailer_product_id
  BEFORE INSERT OR UPDATE ON price_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_retailer_product_id();

COMMENT ON TABLE price_snapshots IS 'Stores historical snapshots of gold prices from various retailers across Vietnam';
COMMENT ON COLUMN price_snapshots.retailer IS 'Name of the retailer (SJC, DOJI, PNJ, etc.)';
COMMENT ON COLUMN price_snapshots.province IS 'Province or city (TP.HCM, Hà Nội, etc.)';
COMMENT ON COLUMN price_snapshots.product_type IS 'Type of gold product (SJC_BARS, SJC_RINGS, etc.)';
COMMENT ON COLUMN price_snapshots.buy_price IS 'Buy price in VND';
COMMENT ON COLUMN price_snapshots.sell_price IS 'Sell price in VND';
COMMENT ON COLUMN price_snapshots.unit IS 'Unit of measurement (VND/chi, VND/gram, etc.)';
COMMENT ON COLUMN price_snapshots.source_job_id IS 'References the backfill job that created this snapshot';
COMMENT ON COLUMN price_snapshots.is_backfilled IS 'True if this snapshot was created by a backfill job';
COMMENT ON COLUMN price_snapshots.product_name IS 'Specific product name from retailer (e.g., "Vàng miếng SJC theo lượng")';
COMMENT ON COLUMN price_snapshots.retailer_product_id IS 'Link to retailer-specific product';
COMMENT ON INDEX idx_price_snapshots_minute_unique IS 'Ensures uniqueness of price snapshots at minute-level granularity for backfilled data';

-- View: Latest prices with retailer product info
CREATE OR REPLACE VIEW latest_prices_with_products AS
SELECT
  ps.id,
  ps.created_at,
  ps.retailer,
  ps.province,
  rp.product_code,
  rp.product_name,
  rp.category,
  ps.buy_price,
  ps.sell_price,
  ps.unit,
  ps.source_url
FROM price_snapshots ps
LEFT JOIN retailer_products rp ON rp.id = ps.retailer_product_id
WHERE ps.created_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW latest_prices_with_products IS 'Latest 24h prices with retailer product information';

-- View: Retailer product catalog with price info
CREATE OR REPLACE VIEW retailer_product_catalog AS
SELECT
  rp.id,
  rp.retailer_code,
  r.name as retailer_name,
  rp.product_code,
  rp.product_name,
  rp.category,
  rp.is_enabled,
  rp.sort_order,
  COUNT(DISTINCT ctm.id) as mapping_count,
  (
    SELECT ps.created_at
    FROM price_snapshots ps
    WHERE ps.retailer_product_id = rp.id
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) as last_price_update,
  (
    SELECT ps.buy_price
    FROM price_snapshots ps
    WHERE ps.retailer_product_id = rp.id
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) as latest_buy_price,
  (
    SELECT ps.sell_price
    FROM price_snapshots ps
    WHERE ps.retailer_product_id = rp.id
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) as latest_sell_price
FROM retailer_products rp
JOIN retailers r ON r.code = rp.retailer_code
LEFT JOIN crawler_type_mappings ctm ON ctm.retailer_product_id = rp.id
GROUP BY rp.id, r.name
ORDER BY rp.retailer_code, rp.sort_order, rp.product_name;

COMMENT ON VIEW retailer_product_catalog IS 'Complete retailer product catalog with latest price info';

-- View: Price snapshots with product names
CREATE OR REPLACE VIEW price_snapshots_with_names AS
SELECT
  ps.id,
  ps.created_at,
  ps.retailer,
  ps.province,
  ps.product_type,
  COALESCE(
    ps.product_name,
    rp.product_name,
    (SELECT ctm.label
     FROM crawler_type_mappings ctm
     WHERE ctm.retailer_code = ps.retailer
       AND ctm.product_type_code = ps.product_type
       AND ctm.is_enabled = true
     LIMIT 1)
  ) as product_name,
  ps.buy_price,
  ps.sell_price,
  ps.unit,
  ps.source_url
FROM price_snapshots ps
LEFT JOIN retailer_products rp ON rp.id = ps.retailer_product_id;

COMMENT ON VIEW price_snapshots_with_names IS 'Price snapshots with product names - includes fallback to type mappings if product_name is NULL';
