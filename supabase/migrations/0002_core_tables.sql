-- 0002_core_tables.sql
-- Core reference data tables

-- Function to check if user is admin (needed for RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Retailers
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retailers_enabled ON retailers(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_retailers_code ON retailers(code);
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled retailers" ON retailers FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage retailers" ON retailers FOR ALL USING (public.is_admin());

-- 3. Provinces
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provinces_enabled ON provinces(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_provinces_code ON provinces(code);
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled provinces" ON provinces FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage provinces" ON provinces FOR ALL USING (public.is_admin());

-- 4. Retailer Products
CREATE TABLE IF NOT EXISTS retailer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_code VARCHAR(50) NOT NULL REFERENCES retailers(code) ON DELETE CASCADE,
  product_code VARCHAR(100) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT retailer_products_unique_code UNIQUE(retailer_code, product_code)
);

CREATE INDEX IF NOT EXISTS idx_retailer_products_retailer ON retailer_products(retailer_code);
CREATE INDEX IF NOT EXISTS idx_retailer_products_enabled ON retailer_products(is_enabled);
CREATE INDEX IF NOT EXISTS idx_retailer_products_retailer_enabled ON retailer_products(retailer_code, is_enabled);
ALTER TABLE retailer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled retailer products" ON retailer_products FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage retailer products" ON retailer_products FOR ALL USING (public.is_admin());

-- 5. API Keys
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
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON api_keys FOR ALL USING (auth.role() = 'service_role');

-- 6. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view system settings" ON system_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update system settings" ON system_settings FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can insert system settings" ON system_settings FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Generic Updated At Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to core tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_retailers_updated_at BEFORE UPDATE ON retailers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_retailer_products_updated_at BEFORE UPDATE ON retailer_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- API Keys Deactivation Function and Trigger
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

CREATE TRIGGER trigger_deactivate_old_keys
  AFTER INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_api_keys();

-- Current API Keys View
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

