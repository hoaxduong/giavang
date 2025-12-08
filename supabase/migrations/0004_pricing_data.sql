-- 0004_pricing_data.sql
-- Gold price snapshots and historical data

-- Price Snapshots (Final schema without retailer and product_name columns)
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  province VARCHAR(100) NOT NULL,
  buy_price DECIMAL(12, 2) NOT NULL,
  sell_price DECIMAL(12, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'VND/chi',
  source_url TEXT,
  source_job_id UUID REFERENCES backfill_jobs(id) ON DELETE SET NULL,
  is_backfilled BOOLEAN DEFAULT false,
  retailer_product_id UUID REFERENCES retailer_products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_created_at ON price_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_job ON price_snapshots(source_job_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_backfilled ON price_snapshots(is_backfilled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_retailer_product ON price_snapshots(retailer_product_id);
CREATE INDEX IF NOT EXISTS idx_lookup ON price_snapshots(retailer_product_id, province, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_series ON price_snapshots(retailer_product_id, created_at DESC);

-- Unique index for backfilled data
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_minute_unique ON price_snapshots(
  retailer_product_id,
  province,
  (date_trunc('minute', created_at AT TIME ZONE 'UTC'))
) WHERE is_backfilled = true;

ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON price_snapshots FOR SELECT USING (true);
CREATE POLICY "Service role can insert" ON price_snapshots FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS AND VIEWS
-- ============================================================================

-- Insert Price Snapshot Function
CREATE OR REPLACE FUNCTION insert_price_snapshot_ignore_duplicate(
  p_province VARCHAR,
  p_retailer_product_id UUID,
  p_buy_price NUMERIC,
  p_sell_price NUMERIC,
  p_unit VARCHAR,
  p_created_at TIMESTAMPTZ,
  p_source_job_id UUID,
  p_is_backfilled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if record already exists to avoid duplicate
  IF EXISTS (
    SELECT 1 FROM price_snapshots
    WHERE retailer_product_id = p_retailer_product_id
      AND province = p_province
      AND date_trunc('minute', created_at AT TIME ZONE 'UTC') = date_trunc('minute', p_created_at AT TIME ZONE 'UTC')
      AND is_backfilled = true
  ) THEN
    RETURN; -- Skip insert if already exists
  END IF;

  -- Insert new record
  INSERT INTO price_snapshots (
    province,
    retailer_product_id,
    buy_price,
    sell_price,
    unit,
    created_at,
    source_job_id,
    is_backfilled
  ) VALUES (
    p_province,
    p_retailer_product_id,
    p_buy_price,
    p_sell_price,
    p_unit,
    p_created_at,
    p_source_job_id,
    p_is_backfilled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO authenticated;
GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO service_role;

-- Latest Prices with Products View
CREATE VIEW latest_prices_with_products AS
SELECT
  ps.id,
  ps.created_at,
  rp.retailer_code as retailer,
  ps.province,
  rp.product_code,
  rp.product_name,
  ps.buy_price,
  ps.sell_price,
  ps.unit,
  ps.source_url
FROM price_snapshots ps
LEFT JOIN retailer_products rp ON rp.id = ps.retailer_product_id
WHERE ps.created_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW latest_prices_with_products IS 'Price snapshots from the last 24 hours with retailer product information';

-- Retailer Product Catalog View
CREATE VIEW retailer_product_catalog AS
SELECT
  rp.id,
  rp.retailer_code,
  r.name as retailer_name,
  rp.product_code,
  rp.product_name,
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

COMMENT ON VIEW retailer_product_catalog IS 'Complete catalog of retailer products with latest price information';

-- Price Snapshots with Names View
CREATE VIEW price_snapshots_with_names AS
SELECT
  ps.id,
  ps.created_at,
  rp.retailer_code as retailer,
  ps.province,
  COALESCE(
    rp.product_name,
    (SELECT ctm.label
     FROM crawler_type_mappings ctm
     WHERE ctm.retailer_product_id = ps.retailer_product_id
       AND ctm.is_enabled = true
     LIMIT 1)
  ) as product_name,
  ps.buy_price,
  ps.sell_price,
  ps.unit,
  ps.source_url
FROM price_snapshots ps
LEFT JOIN retailer_products rp ON rp.id = ps.retailer_product_id;

COMMENT ON VIEW price_snapshots_with_names IS 'Price snapshots with product names and retailer code';

