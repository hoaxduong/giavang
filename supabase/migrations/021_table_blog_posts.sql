-- Blog Posts table
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

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can read all posts" ON blog_posts FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert posts" ON blog_posts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update posts" ON blog_posts FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete posts" ON blog_posts FOR DELETE USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE blog_posts IS 'Blog posts with rich content, SEO, and full-text search';
COMMENT ON COLUMN blog_posts.content IS 'Rich content in Tiptap JSON format';
COMMENT ON COLUMN blog_posts.status IS 'Post status: draft, published, archived';
COMMENT ON COLUMN blog_posts.search_vector IS 'Full-text search vector (auto-generated)';
COMMENT ON COLUMN blog_posts.view_count IS 'Number of times post has been viewed';
COMMENT ON COLUMN blog_posts.comment_count IS 'Number of approved comments (auto-updated)';
