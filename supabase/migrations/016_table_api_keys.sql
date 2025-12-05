-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  provider VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  api_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_active_keys ON api_keys(provider, scope, expires_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_expiring_soon ON api_keys(expires_at) WHERE is_active = true;

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON api_keys FOR ALL USING (auth.role() = 'service_role');

-- Trigger Function
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

-- Trigger
CREATE TRIGGER trigger_deactivate_old_keys
  AFTER INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_api_keys();

-- View: Current API Keys
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
