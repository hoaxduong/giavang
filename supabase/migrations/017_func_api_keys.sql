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
