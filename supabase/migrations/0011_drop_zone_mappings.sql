-- Drop zone_mappings table and related objects
-- This table is no longer needed as Onus crawler now uses empty province for all data

-- Drop triggers first
DROP TRIGGER IF EXISTS update_zone_mappings_updated_at ON zone_mappings;

-- Drop indexes
DROP INDEX IF EXISTS idx_zone_mappings_source_id;
DROP INDEX IF EXISTS idx_zone_mappings_source_zone;
DROP INDEX IF EXISTS idx_zone_mappings_enabled;

-- Drop table
DROP TABLE IF EXISTS zone_mappings;
