-- Blog Comments table
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

-- RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved comments" ON blog_comments FOR SELECT USING (status = 'approved');
CREATE POLICY "Admins can read all comments" ON blog_comments FOR SELECT USING (public.is_admin());
CREATE POLICY "Authenticated users can create comments" ON blog_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own pending comments" ON blog_comments FOR UPDATE USING (auth.uid() = author_id AND status = 'pending');
CREATE POLICY "Admins can moderate comments" ON blog_comments FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete comments" ON blog_comments FOR DELETE USING (public.is_admin());

-- Trigger
DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;
CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE blog_comments IS 'User comments on blog posts with moderation workflow';
COMMENT ON COLUMN blog_comments.status IS 'Comment status: pending, approved, rejected, spam';
COMMENT ON COLUMN blog_comments.author_name IS 'For non-authenticated users (future)';
COMMENT ON COLUMN blog_comments.author_email IS 'For non-authenticated users (future)';
