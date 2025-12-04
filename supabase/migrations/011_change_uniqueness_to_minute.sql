-- ============================================================================
-- Migration 011: Change Price Snapshot Uniqueness from Daily to Minute
-- ============================================================================
-- Changes the unique constraint on price_snapshots from day-level to minute-level
-- and updates the duplicate-checking function accordingly
-- ============================================================================

-- Drop the existing day-level unique index
DROP INDEX IF EXISTS idx_price_snapshots_daily_unique;

-- Create a new minute-level unique index
-- Uses date_trunc to truncate timestamps to minute precision
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_minute_unique ON price_snapshots(
  retailer,
  province,
  product_type,
  (date_trunc('minute', created_at AT TIME ZONE 'UTC'))
) WHERE is_backfilled = true;

-- Update the insert function to check for minute-level duplicates
CREATE OR REPLACE FUNCTION insert_price_snapshot_ignore_duplicate(
  p_retailer VARCHAR,
  p_province VARCHAR,
  p_product_type VARCHAR,
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
  -- The unique index uses expression (date_trunc('minute', created_at AT TIME ZONE 'UTC'))
  IF EXISTS (
    SELECT 1 FROM price_snapshots
    WHERE retailer = p_retailer
      AND province = p_province
      AND product_type = p_product_type
      AND date_trunc('minute', created_at AT TIME ZONE 'UTC') = date_trunc('minute', p_created_at AT TIME ZONE 'UTC')
      AND is_backfilled = true
  ) THEN
    RETURN; -- Skip insert if already exists
  END IF;

  -- Insert new record
  INSERT INTO price_snapshots (
    retailer,
    province,
    product_type,
    buy_price,
    sell_price,
    unit,
    created_at,
    source_job_id,
    is_backfilled
  ) VALUES (
    p_retailer,
    p_province,
    p_product_type,
    p_buy_price,
    p_sell_price,
    p_unit,
    p_created_at,
    p_source_job_id,
    p_is_backfilled
  );
END;
$$;

-- Maintain the same grants as before
GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO authenticated;
GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO service_role;

-- Add comment for documentation
COMMENT ON INDEX idx_price_snapshots_minute_unique IS 'Ensures uniqueness of price snapshots at minute-level granularity for backfilled data';
