-- 0002_functions.sql
-- Consolidated functions and triggers

-- 1. Generic Updated At Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_retailers_updated_at BEFORE UPDATE ON retailers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_retailer_products_updated_at BEFORE UPDATE ON retailer_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crawler_sources_updated_at BEFORE UPDATE ON crawler_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crawler_type_mappings_updated_at BEFORE UPDATE ON crawler_type_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_zone_mappings_updated_at BEFORE UPDATE ON zone_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_backfill_jobs_updated_at BEFORE UPDATE ON backfill_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_portfolio_updated_at BEFORE UPDATE ON user_portfolio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_categories_updated_at BEFORE UPDATE ON blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_tags_updated_at BEFORE UPDATE ON blog_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON blog_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Insert Price Snapshot (Refactored)
CREATE OR REPLACE FUNCTION insert_price_snapshot_ignore_duplicate(
  p_province VARCHAR,
  p_retailer_product_id UUID,
  p_buy_price NUMERIC,
  p_sell_price NUMERIC,
  p_unit VARCHAR,
  p_created_at TIMESTAMPTZ,
  p_source_job_id UUID,
  p_is_backfilled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if record already exists to avoid duplicate
  -- The unique index uses expression (date_trunc('minute', created_at AT TIME ZONE 'UTC'))
  IF EXISTS (
    SELECT 1 FROM price_snapshots
    WHERE retailer_product_id = p_retailer_product_id
      AND province = p_province
      AND date_trunc('minute', created_at AT TIME ZONE 'UTC') = date_trunc('minute', p_created_at AT TIME ZONE 'UTC')
      AND is_backfilled = true
  ) THEN
    RETURN; -- Skip insert if already exists
  END IF;

  -- Insert new record
  INSERT INTO price_snapshots (
    province,
    retailer_product_id,
    buy_price,
    sell_price,
    unit,
    created_at,
    source_job_id,
    is_backfilled
  ) VALUES (
    p_province,
    p_retailer_product_id,
    p_buy_price,
    p_sell_price,
    p_unit,
    p_created_at,
    p_source_job_id,
    p_is_backfilled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO authenticated;
GRANT EXECUTE ON FUNCTION insert_price_snapshot_ignore_duplicate TO service_role;


-- 3. API Keys Deactivation
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


-- 4. Blog Search Vector
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

CREATE TRIGGER blog_posts_search_update
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION blog_posts_search_trigger();


-- 5. Blog Comment Count
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

CREATE TRIGGER blog_comments_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comment_count();
