-- ============================================================================
-- Migration: Remove vang.today crawler source
-- Description: Removes vang.today as a crawler source and all associated
--              type mappings. This is part of the cleanup to remove the
--              vang.today crawler implementation.
-- ============================================================================

-- Remove all type mappings for vang.today source
DELETE FROM crawler_type_mappings
WHERE source_id IN (
  SELECT id FROM crawler_sources WHERE name = 'vang.today'
);

-- Remove vang.today crawler source
DELETE FROM crawler_sources
WHERE name = 'vang.today';

-- Add comment documenting the change
COMMENT ON TABLE crawler_sources IS 'External API sources for price data collection. Note: vang.today source removed in migration 012.';
