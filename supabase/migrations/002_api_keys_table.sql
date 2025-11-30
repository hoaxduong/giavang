-- API Keys Table for storing vnappmob API keys
-- Keys expire after 15 days by default

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  provider VARCHAR(50) NOT NULL, -- 'vnappmob'
  scope VARCHAR(50) NOT NULL, -- 'gold'
  api_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  notes TEXT
);

-- Index for finding active, non-expired keys
CREATE INDEX IF NOT EXISTS idx_active_keys
  ON api_keys(provider, scope, expires_at DESC)
  WHERE is_active = true;

-- Index for expiration monitoring
CREATE INDEX IF NOT EXISTS idx_expiring_soon
  ON api_keys(expires_at)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only service role can manage API keys (server-side only)
CREATE POLICY "Service role full access" ON api_keys
  FOR ALL
  USING (auth.role() = 'service_role');

-- View for getting current valid key
CREATE OR REPLACE VIEW current_api_keys AS
SELECT DISTINCT ON (provider, scope)
  id,
  provider,
  scope,
  api_key,
  expires_at,
  last_used_at,
  request_count
FROM api_keys
WHERE is_active = true
  AND expires_at > NOW()
ORDER BY provider, scope, expires_at DESC;

-- Function to get current valid API key
CREATE OR REPLACE FUNCTION get_current_api_key(
  p_provider VARCHAR(50),
  p_scope VARCHAR(50)
)
RETURNS TABLE (
  api_key TEXT,
  expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.api_key,
    k.expires_at,
    EXTRACT(DAY FROM (k.expires_at - NOW()))::INTEGER as days_until_expiry
  FROM api_keys k
  WHERE k.provider = p_provider
    AND k.scope = p_scope
    AND k.is_active = true
    AND k.expires_at > NOW()
  ORDER BY k.expires_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark old keys as inactive when adding new ones
CREATE OR REPLACE FUNCTION deactivate_old_api_keys()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new key is inserted, deactivate old keys for the same provider/scope
  UPDATE api_keys
  SET is_active = false
  WHERE provider = NEW.provider
    AND scope = NEW.scope
    AND id != NEW.id
    AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-deactivate old keys
CREATE TRIGGER trigger_deactivate_old_keys
  AFTER INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_api_keys();

-- Function to update key usage stats
CREATE OR REPLACE FUNCTION update_api_key_usage(p_key_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET
    last_used_at = NOW(),
    request_count = request_count + 1
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
