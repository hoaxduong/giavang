-- ============================================================================
-- Migration 010: Insert Price Snapshot with Duplicate Ignore
-- ============================================================================
-- Creates a function to insert price snapshots with ON CONFLICT DO NOTHING
-- to handle the expression-based unique constraint
-- ============================================================================

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
  -- The unique index uses expression ((created_at AT TIME ZONE 'UTC')::date)
  IF EXISTS (
    SELECT 1 FROM price_snapshots
    WHERE retailer = p_retailer
      AND province = p_province
      AND product_type = p_product_type
      AND (created_at AT TIME ZONE 'UTC')::date = (p_created_at AT TIME ZONE 'UTC')::date
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO authenticated;
GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO service_role;
