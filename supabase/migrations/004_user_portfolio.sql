-- User Portfolio Table
-- Stores user's gold purchase transactions

CREATE TABLE IF NOT EXISTS user_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL CHECK (amount > 0),
  retailer VARCHAR(50) NOT NULL,
  product_type VARCHAR(50) NOT NULL,
  province VARCHAR(100),
  bought_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  buy_price DECIMAL(12, 2) NOT NULL CHECK (buy_price > 0),
  sell_price DECIMAL(12, 2) CHECK (sell_price IS NULL OR sell_price > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_portfolio_user_id ON user_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_bought_at ON user_portfolio(bought_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_sold_at ON user_portfolio(sold_at DESC);

-- Enable Row Level Security
ALTER TABLE user_portfolio ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own portfolio entries
CREATE POLICY "Users can read own portfolio"
  ON user_portfolio
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own portfolio entries
CREATE POLICY "Users can insert own portfolio"
  ON user_portfolio
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own portfolio entries
CREATE POLICY "Users can update own portfolio"
  ON user_portfolio
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own portfolio entries
CREATE POLICY "Users can delete own portfolio"
  ON user_portfolio
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on portfolio updates
DROP TRIGGER IF EXISTS update_user_portfolio_updated_at ON user_portfolio;
CREATE TRIGGER update_user_portfolio_updated_at
  BEFORE UPDATE ON user_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_portfolio_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_portfolio IS 'User portfolio entries tracking gold purchases and sales';
COMMENT ON COLUMN user_portfolio.amount IS 'Amount of gold in chỉ';
COMMENT ON COLUMN user_portfolio.buy_price IS 'Purchase price in VND/chi at bought_at time';
COMMENT ON COLUMN user_portfolio.sell_price IS 'Sale price in VND/chi at sold_at time (null if not sold)';

