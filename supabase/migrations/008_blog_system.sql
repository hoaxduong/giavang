-- ============================================================================
-- BLOG SYSTEM
-- Comprehensive blog with posts, categories, tags, comments, and full-text search
-- ============================================================================

-- ============================================================================
-- BLOG CATEGORIES TABLE
-- ============================================================================

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

COMMENT ON TABLE blog_categories IS 'Blog post categories for organization';
COMMENT ON COLUMN blog_categories.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN blog_categories.is_enabled IS 'Whether category is active and visible';

-- ============================================================================
-- BLOG TAGS TABLE
-- ============================================================================

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

COMMENT ON TABLE blog_tags IS 'Blog post tags for flexible categorization';
COMMENT ON COLUMN blog_tags.slug IS 'URL-friendly identifier';

-- ============================================================================
-- BLOG POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL,
  featured_image_url TEXT,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status workflow
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  -- SEO fields
  meta_title VARCHAR(200),
  meta_description TEXT,
  og_image_url TEXT,

  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- Full-text search
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

COMMENT ON TABLE blog_posts IS 'Blog posts with rich content, SEO, and full-text search';
COMMENT ON COLUMN blog_posts.content IS 'Rich content in Tiptap JSON format';
COMMENT ON COLUMN blog_posts.status IS 'Post status: draft, published, archived';
COMMENT ON COLUMN blog_posts.search_vector IS 'Full-text search vector (auto-generated)';
COMMENT ON COLUMN blog_posts.view_count IS 'Number of times post has been viewed';
COMMENT ON COLUMN blog_posts.comment_count IS 'Number of approved comments (auto-updated)';

-- ============================================================================
-- BLOG POST TAGS JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);

COMMENT ON TABLE blog_post_tags IS 'Many-to-many relationship between posts and tags';

-- ============================================================================
-- BLOG COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name VARCHAR(100),
  author_email VARCHAR(200),
  content TEXT NOT NULL,

  -- Moderation
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,

  -- Threading support (optional for future)
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_comment_status CHECK (status IN ('pending', 'approved', 'rejected', 'spam'))
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_author ON blog_comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_id);

COMMENT ON TABLE blog_comments IS 'User comments on blog posts with moderation workflow';
COMMENT ON COLUMN blog_comments.status IS 'Comment status: pending, approved, rejected, spam';
COMMENT ON COLUMN blog_comments.author_name IS 'For non-authenticated users (future)';
COMMENT ON COLUMN blog_comments.author_email IS 'For non-authenticated users (future)';

-- ============================================================================
-- FULL-TEXT SEARCH FUNCTIONS
-- ============================================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION blog_posts_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.content::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector updates
DROP TRIGGER IF EXISTS blog_posts_search_update ON blog_posts;
CREATE TRIGGER blog_posts_search_update
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION blog_posts_search_trigger();

-- ============================================================================
-- COMMENT COUNT TRIGGER
-- ============================================================================

-- Function to update comment count on posts
CREATE OR REPLACE FUNCTION update_blog_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE blog_posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    UPDATE blog_posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE blog_posts
    SET comment_count = comment_count - 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE blog_posts
    SET comment_count = comment_count - 1
    WHERE id = OLD.post_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_comments_count_trigger ON blog_comments;
CREATE TRIGGER blog_comments_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comment_count();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Categories: Public read enabled, admin write
CREATE POLICY "Public can read enabled categories"
  ON blog_categories FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admins can manage categories"
  ON blog_categories FOR ALL
  USING (public.is_admin());

-- Tags: Public read enabled, admin write
CREATE POLICY "Public can read enabled tags"
  ON blog_tags FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admins can manage tags"
  ON blog_tags FOR ALL
  USING (public.is_admin());

-- Posts: Public read published, admin full access
CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can read all posts"
  ON blog_posts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert posts"
  ON blog_posts FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update posts"
  ON blog_posts FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete posts"
  ON blog_posts FOR DELETE
  USING (public.is_admin());

-- Post tags: Public read for published posts, admin write
CREATE POLICY "Public can read tags of published posts"
  ON blog_post_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_tags.post_id
      AND blog_posts.status = 'published'
    )
  );

CREATE POLICY "Admins can manage post tags"
  ON blog_post_tags FOR ALL
  USING (public.is_admin());

-- Comments: Public read approved, authenticated users can create, admin moderate
CREATE POLICY "Public can read approved comments"
  ON blog_comments FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can read all comments"
  ON blog_comments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can create comments"
  ON blog_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own pending comments"
  ON blog_comments FOR UPDATE
  USING (auth.uid() = author_id AND status = 'pending');

CREATE POLICY "Admins can moderate comments"
  ON blog_comments FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete comments"
  ON blog_comments FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_tags_updated_at ON blog_tags;
CREATE TRIGGER update_blog_tags_updated_at
  BEFORE UPDATE ON blog_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;
CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default blog categories
INSERT INTO blog_categories (slug, name, description, sort_order)
VALUES
  ('tin-tuc-vang', 'Tin tức vàng', 'Tin tức và phân tích thị trường vàng', 1),
  ('huong-dan', 'Hướng dẫn', 'Hướng dẫn đầu tư và giao dịch vàng', 2)
ON CONFLICT (slug) DO NOTHING;
