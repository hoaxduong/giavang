-- 0001_schema.sql
-- Consolidated schema migration

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE user_role AS ENUM ('user', 'admin');

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

-- Function to check if user is admin
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

-- 4. Retailer Products (Refactored: No category)
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
-- Add policies if needed, assuming public read for now or admin managed
CREATE POLICY "Public can read enabled retailer products" ON retailer_products FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage retailer products" ON retailer_products FOR ALL USING (public.is_admin());


-- 5. Crawler Sources
CREATE TABLE IF NOT EXISTS crawler_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  api_url TEXT NOT NULL,
  api_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}',
  auth_type VARCHAR(50),
  auth_config JSONB,
  rate_limit_per_minute INTEGER DEFAULT 60,
  timeout_seconds INTEGER DEFAULT 30,
  priority INTEGER DEFAULT 1,
  field_mappings JSONB DEFAULT '{}'::jsonb,
  retailer_filter JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawler_sources_enabled ON crawler_sources(is_enabled, priority);
CREATE INDEX IF NOT EXISTS idx_crawler_sources_name ON crawler_sources(name);
ALTER TABLE crawler_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled crawler sources" ON crawler_sources FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage crawler sources" ON crawler_sources FOR ALL USING (public.is_admin());

-- 6. Crawler Type Mappings (Refactored: No product_type_code)
CREATE TABLE IF NOT EXISTS crawler_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawler_sources(id) ON DELETE CASCADE,
  external_code VARCHAR(100) NOT NULL,
  retailer_code VARCHAR(50) NOT NULL,
  province_code VARCHAR(50),
  label VARCHAR(200) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  retailer_product_id UUID REFERENCES retailer_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, external_code)
);

CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_source ON crawler_type_mappings(source_id, external_code, is_enabled);
CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_enabled ON crawler_type_mappings(is_enabled);
CREATE INDEX IF NOT EXISTS idx_crawler_type_mappings_retailer ON crawler_type_mappings(retailer_code);
CREATE INDEX IF NOT EXISTS idx_type_mappings_retailer_product ON crawler_type_mappings(retailer_product_id);
ALTER TABLE crawler_type_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled type mappings" ON crawler_type_mappings FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage type mappings" ON crawler_type_mappings FOR ALL USING (public.is_admin());

-- 7. Crawler Logs
CREATE TABLE IF NOT EXISTS crawler_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES crawler_sources(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  records_fetched INTEGER DEFAULT 0,
  records_saved INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  request_url TEXT,
  request_method VARCHAR(10) DEFAULT 'GET',
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  failed_items JSONB,
  trigger_type VARCHAR(50),
  trigger_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawler_logs_source ON crawler_logs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_status ON crawler_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_date ON crawler_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_trigger ON crawler_logs(trigger_type, started_at DESC);
ALTER TABLE crawler_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read crawler logs" ON crawler_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert crawler logs" ON crawler_logs FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NULL);

-- 8. Zone Mappings
CREATE TABLE IF NOT EXISTS zone_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawler_sources(id) ON DELETE CASCADE,
  zone_text VARCHAR(100) NOT NULL,
  province_code VARCHAR(50) NOT NULL REFERENCES provinces(code),
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT zone_mappings_source_zone_unique UNIQUE(source_id, zone_text)
);

CREATE INDEX IF NOT EXISTS idx_zone_mappings_source_id ON zone_mappings(source_id);
CREATE INDEX IF NOT EXISTS idx_zone_mappings_source_zone ON zone_mappings(source_id, zone_text);
CREATE INDEX IF NOT EXISTS idx_zone_mappings_enabled ON zone_mappings(is_enabled);
ALTER TABLE zone_mappings ENABLE ROW LEVEL SECURITY;
-- Add policies if needed

-- 9. Backfill Jobs
CREATE TABLE IF NOT EXISTS backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL,
  source_id UUID REFERENCES crawler_sources(id) ON DELETE SET NULL,
  config JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  progress_percent INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  failed_items JSONB,
  checkpoint_data JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status ON backfill_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_source ON backfill_jobs(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_created_by ON backfill_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_type ON backfill_jobs(job_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_backfill_jobs_active_source ON backfill_jobs(source_id) WHERE status IN ('pending', 'running', 'paused');
ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage backfill jobs" ON backfill_jobs FOR ALL USING (public.is_admin());

-- 10. Price Snapshots (Refactored: No category, no product_type)
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retailer VARCHAR(50) NOT NULL,
  province VARCHAR(100) NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_job ON price_snapshots(source_job_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_backfilled ON price_snapshots(is_backfilled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_name ON price_snapshots(product_name);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_retailer_product_name ON price_snapshots(retailer, product_name);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_retailer_product ON price_snapshots(retailer_product_id);

-- New indexes from refactor
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

-- 11. API Keys
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

-- 12. User Portfolio
CREATE TABLE IF NOT EXISTS user_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL CHECK (amount > 0),
  retailer VARCHAR(50) NOT NULL,
  product_type VARCHAR(50) NOT NULL, -- Keeping this for now as legacy/user input, or should we map to retailer_product_id?
  province VARCHAR(100),
  bought_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  buy_price DECIMAL(12, 2) NOT NULL CHECK (buy_price > 0),
  sell_price DECIMAL(12, 2) CHECK (sell_price IS NULL OR sell_price > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_portfolio_user_id ON user_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_bought_at ON user_portfolio(bought_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_sold_at ON user_portfolio(sold_at DESC);
ALTER TABLE user_portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own portfolio" ON user_portfolio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio" ON user_portfolio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON user_portfolio FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio" ON user_portfolio FOR DELETE USING (auth.uid() = user_id);

-- 13. Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_enabled ON blog_categories(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled categories" ON blog_categories FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage categories" ON blog_categories FOR ALL USING (public.is_admin());

-- 14. Blog Tags
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_enabled ON blog_tags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enabled tags" ON blog_tags FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage tags" ON blog_tags FOR ALL USING (public.is_admin());

-- 15. Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL,
  featured_image_url TEXT,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  meta_title VARCHAR(200),
  meta_description TEXT,
  og_image_url TEXT,
  view_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON blog_posts USING gin(search_vector);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published posts" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can read all posts" ON blog_posts FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert posts" ON blog_posts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update posts" ON blog_posts FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete posts" ON blog_posts FOR DELETE USING (public.is_admin());

-- 16. Blog Post Tags
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tags of published posts" ON blog_post_tags FOR SELECT USING (EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_post_tags.post_id AND blog_posts.status = 'published'));
CREATE POLICY "Admins can manage post tags" ON blog_post_tags FOR ALL USING (public.is_admin());

-- 17. Blog Comments
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name VARCHAR(100),
  author_email VARCHAR(200),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_comment_status CHECK (status IN ('pending', 'approved', 'rejected', 'spam'))
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_author ON blog_comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_id);
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read approved comments" ON blog_comments FOR SELECT USING (status = 'approved');
CREATE POLICY "Admins can read all comments" ON blog_comments FOR SELECT USING (public.is_admin());
CREATE POLICY "Authenticated users can create comments" ON blog_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own pending comments" ON blog_comments FOR UPDATE USING (auth.uid() = author_id AND status = 'pending');
CREATE POLICY "Admins can moderate comments" ON blog_comments FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete comments" ON blog_comments FOR DELETE USING (public.is_admin());
