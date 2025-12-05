-- Blog Tags table
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

-- RLS
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled tags" ON blog_tags FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage tags" ON blog_tags FOR ALL USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_blog_tags_updated_at ON blog_tags;
CREATE TRIGGER update_blog_tags_updated_at
  BEFORE UPDATE ON blog_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE blog_tags IS 'Blog post tags for flexible categorization';
COMMENT ON COLUMN blog_tags.slug IS 'URL-friendly identifier';
