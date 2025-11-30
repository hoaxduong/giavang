-- Initial schema for Vietnamese Gold Price Tracker
-- Run this in your Supabase SQL Editor

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
  source_url TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_created_at ON price_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookup ON price_snapshots(product_type, retailer, province, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_series ON price_snapshots(product_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (no authentication required for MVP)
CREATE POLICY "Public read access"
  ON price_snapshots
  FOR SELECT
  USING (true);

-- Create policy for service role to insert/update (for cron job)
CREATE POLICY "Service role can insert"
  ON price_snapshots
  FOR INSERT
  WITH CHECK (true);

-- Optional: Add comments for documentation
COMMENT ON TABLE price_snapshots IS 'Stores historical snapshots of gold prices from various retailers across Vietnam';
COMMENT ON COLUMN price_snapshots.retailer IS 'Name of the retailer (SJC, DOJI, PNJ, etc.)';
COMMENT ON COLUMN price_snapshots.province IS 'Province or city (TP.HCM, Hà Nội, etc.)';
COMMENT ON COLUMN price_snapshots.product_type IS 'Type of gold product (SJC_BARS, SJC_RINGS, etc.)';
COMMENT ON COLUMN price_snapshots.buy_price IS 'Buy price in VND';
COMMENT ON COLUMN price_snapshots.sell_price IS 'Sell price in VND';
COMMENT ON COLUMN price_snapshots.unit IS 'Unit of measurement (VND/chi, VND/gram, etc.)';
