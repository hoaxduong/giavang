-- Blog Post Tags table
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- RLS
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tags of published posts" ON blog_post_tags FOR SELECT USING (EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_post_tags.post_id AND blog_posts.status = 'published'));
CREATE POLICY "Admins can manage post tags" ON blog_post_tags FOR ALL USING (public.is_admin());

COMMENT ON TABLE blog_post_tags IS 'Many-to-many relationship between posts and tags';
