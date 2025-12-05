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

-- Trigger
DROP TRIGGER IF EXISTS blog_comments_count_trigger ON blog_comments;
CREATE TRIGGER blog_comments_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comment_count();
