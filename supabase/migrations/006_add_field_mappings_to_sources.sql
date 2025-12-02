-- Add field_mappings configuration to crawler_sources
-- Allows each source to define how to extract and map data from their API response

ALTER TABLE crawler_sources
ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN crawler_sources.field_mappings IS 'Configuration for parsing and mapping API response fields. Structure:
{
  "dataPath": "data.prices",           // Path to the prices array in API response
  "fields": {
    "typeCode": "type",                // API field name for external type code
    "buyPrice": "buy",                 // API field name for buy price
    "sellPrice": "sell",               // API field name for sell price
    "timestamp": "updated_at",         // API field name for timestamp
    "currency": "currency"             // Optional: currency field
  },
  "transforms": {
    "timestamp": "iso8601|unix",       // Format of timestamp
    "priceMultiplier": 1000            // Optional: multiply prices by this value
  }
}';

-- Update existing vang.today source with its field mappings
-- Note: vang.today API structure:
-- {
--   "success": true,
--   "timestamp": 1234567890,  (unix timestamp at root level)
--   "prices": {
--     "SJL1L10": { "buy": 12345, "sell": 12345, ... },
--     ...
--   }
-- }
UPDATE crawler_sources
SET field_mappings = '{
  "dataPath": "prices",
  "fields": {
    "typeCode": "type",
    "buyPrice": "buy",
    "sellPrice": "sell",
    "timestamp": "timestamp",
    "currency": "currency"
  },
  "transforms": {
    "timestamp": "unix",
    "priceMultiplier": 1
  }
}'::jsonb
WHERE name = 'vang.today';
