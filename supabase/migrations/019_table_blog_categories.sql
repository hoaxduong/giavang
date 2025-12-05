-- Blog Categories table
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

-- RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled categories" ON blog_categories FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage categories" ON blog_categories FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE blog_categories IS 'Blog post categories for organization';
COMMENT ON COLUMN blog_categories.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN blog_categories.is_enabled IS 'Whether category is active and visible';
