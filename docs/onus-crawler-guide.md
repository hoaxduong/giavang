# Onus Crawler Quick Start Guide

## Overview

The Onus crawler fetches gold prices from the Onus Exchange API (exchange.goonus.io) which aggregates prices from multiple retailers including SJC, PNJ, DOJI, Bảo Tín Minh Châu, and others.

## Setup Instructions

### 1. Run the Database Migrations

Apply the migrations to set up the database schema and initial data:

```bash
# These migrations are in supabase/migrations/
# 013_onus_crawler_setup.sql - Creates zone_mappings table, adds Onus source
# 014_onus_initial_type_mappings.sql - Adds initial type mappings for common products
```

After running these migrations, you'll have:
- `zone_mappings` table for mapping zone names to provinces
- Onus crawler source configured and enabled
- 18+ initial type mappings for common products (SJC, PNJ, DOJI, BTMC)

### 2. Verify the Setup

Check that everything is configured:

```sql
-- Check Onus source exists
SELECT id, name, api_type, is_enabled, api_url
FROM crawler_sources
WHERE api_type = 'onus';

-- Check zone mappings
SELECT zone_text, province_code, is_enabled
FROM zone_mappings zm
JOIN crawler_sources cs ON cs.id = zm.source_id
WHERE cs.api_type = 'onus';

-- Check type mappings
SELECT
  external_code as slug,
  retailer_code,
  product_type_code,
  label,
  is_enabled
FROM crawler_type_mappings ctm
JOIN crawler_sources cs ON cs.id = ctm.source_id
WHERE cs.api_type = 'onus'
ORDER BY retailer_code, external_code;
```

### 3. Test the Crawler

#### Option A: Via API Endpoint

```bash
# Get the Onus source ID first
curl https://your-domain.com/api/admin/crawler/sources

# Trigger sync for Onus source
curl -X POST https://your-domain.com/api/prices/sync \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "YOUR_ONUS_SOURCE_ID"}'
```

#### Option B: Via Database Function

```sql
-- Get the Onus source ID
SELECT id FROM crawler_sources WHERE api_type = 'onus';

-- Check recent logs
SELECT
  started_at,
  completed_at,
  status,
  records_fetched,
  records_saved,
  records_failed,
  error_message
FROM crawler_logs
WHERE source_id = 'YOUR_ONUS_SOURCE_ID'
ORDER BY started_at DESC
LIMIT 5;
```

## How Type Mappings Work

The Onus API returns products with a `slug` identifier (e.g., `"sjc-1l-10l-1kg"`). Type mappings tell the crawler how to convert these slugs into your internal format:

```
API Response:
{
  "slug": "sjc-1l-10l-1kg",
  "type": "Vàng miếng SJC theo lượng",
  "source": "sjc",
  "buy": 88500000,
  "sell": 89000000,
  "zone": {
    "text": "Hồ Chí Minh"
  }
}

Type Mapping:
external_code: "sjc-1l-10l-1kg"  → slug from API
retailer_code: "SJC"             → internal retailer
product_type_code: "SJC_BARS"    → internal product type
province_code: NULL              → use zone mapping from API
```

## Adding More Type Mappings

### Method 1: Use the Helper Script

Edit `scripts/add-onus-mapping.sql` and replace the placeholder values:

```sql
INSERT INTO crawler_type_mappings (
  source_id,
  external_code,      -- The "slug" from API
  retailer_code,      -- Your internal retailer code
  product_type_code,  -- Your internal product type
  province_code,      -- NULL = use zone from API
  label,
  is_enabled
) VALUES (
  onus_source_id,
  'nhan-tron-9999-hung-thinh-vuong',  -- From API
  'DOJI',                              -- Internal code
  'GOLD_9999',                         -- Internal code
  NULL,                                -- Use zone mapping
  'Nhẫn Tròn 9999 Hưng Thịnh Vượng',
  true
);
```

### Method 2: Via API (Future Enhancement)

The API endpoints are ready but UI is not yet implemented:

```bash
POST /api/admin/crawler/mappings
{
  "sourceId": "YOUR_ONUS_SOURCE_ID",
  "externalCode": "nhan-tron-9999-hung-thinh-vuong",
  "retailerCode": "DOJI",
  "productTypeCode": "GOLD_9999",
  "provinceCode": null,
  "label": "Nhẫn Tròn 9999 Hưng Thịnh Vượng",
  "isEnabled": true
}
```

## Zone Mappings

Zone mappings convert the `zone.text` from the API to your internal province codes:

```
Zone Mappings (already configured):
"Hồ Chí Minh" → "TP. Hồ Chí Minh"
"Hà Nội"      → "Hà Nội"
"Đà Nẵng"     → "Đà Nẵng"
"Cần Thơ"     → "Cần Thơ"
```

If a product doesn't have zone data or the zone isn't mapped, it defaults to **"TP. Hồ Chí Minh"**.

### Adding Zone Mappings

```sql
INSERT INTO zone_mappings (source_id, zone_text, province_code, is_enabled)
SELECT id, 'Nha Trang', 'Khánh Hòa', true
FROM crawler_sources
WHERE api_type = 'onus';
```

## Retailer Filtering

You can configure the Onus source to only fetch prices from specific retailers:

```sql
-- Fetch prices from all retailers (default)
UPDATE crawler_sources
SET retailer_filter = NULL
WHERE api_type = 'onus';

-- Fetch prices only from SJC and PNJ
UPDATE crawler_sources
SET retailer_filter = '["SJC", "PNJ"]'::jsonb
WHERE api_type = 'onus';

-- Fetch prices only from DOJI
UPDATE crawler_sources
SET retailer_filter = '["DOJI"]'::jsonb
WHERE api_type = 'onus';
```

## Troubleshooting

### "No enabled mapping found" Error

**Cause:** The crawler found products in the API but no matching type mappings in your database.

**Solution:** Add type mappings for the products you want to track. Check the error details in `crawler_logs` to see which slugs are missing:

```sql
SELECT failed_items
FROM crawler_logs
WHERE source_id = 'YOUR_ONUS_SOURCE_ID'
  AND status = 'partial_success'
ORDER BY started_at DESC
LIMIT 1;
```

### "Retailer X is disabled or not found" Error

**Cause:** The retailer from the API doesn't exist in your `retailers` table or is disabled.

**Solution:** Add the retailer to your database:

```sql
INSERT INTO retailers (code, name, is_enabled, sort_order)
VALUES ('NEW_RETAILER', 'New Retailer Name', true, 10)
ON CONFLICT (code) DO UPDATE SET is_enabled = true;
```

### "Province X is disabled" Error

**Cause:** The mapped province is disabled in your `provinces` table.

**Solution:** Enable the province or update the zone mapping to use a different province:

```sql
-- Enable the province
UPDATE provinces SET is_enabled = true WHERE code = 'Province Code';

-- Or update the zone mapping
UPDATE zone_mappings
SET province_code = 'TP. Hồ Chí Minh'
WHERE zone_text = 'Some Zone';
```

### No Prices Saved

Check the following:
1. Type mappings exist and are enabled
2. Retailers are enabled
3. Product types are enabled
4. Provinces are enabled
5. The API is returning data

```sql
-- Check enabled items
SELECT COUNT(*) FROM crawler_type_mappings WHERE source_id = 'ONUS_ID' AND is_enabled = true;
SELECT COUNT(*) FROM retailers WHERE is_enabled = true;
SELECT COUNT(*) FROM product_types WHERE is_enabled = true;
SELECT COUNT(*) FROM provinces WHERE is_enabled = true;
```

## Historical Data (Backfill)

The Onus crawler supports fetching historical data from the `/line` endpoint:

```typescript
import { OnusHistoricalCrawler } from "@/lib/api/crawler/onus-historical-crawler";

// Create crawler instance
const crawler = new OnusHistoricalCrawler(config);

// Fetch historical data for a specific slug
const result = await crawler.fetchHistoricalPrices(
  "sjc-1l-10l-1kg",  // Product slug
  365                // Number of days (informational)
);

// Result contains array of historical price data
console.log(result.data);  // Array of OnusDailyPriceData
```

## API Reference

### Onus API Endpoints Used

1. **GET /golds** - Current prices for all products
   - Returns: Array of products with buy/sell prices, zones
   - Used by: `OnusCrawler`

2. **GET /line?slug={slug}&interval=1M** - Historical prices
   - Returns: Array of historical price points
   - Used by: `OnusHistoricalCrawler`

3. **GET /golds/sources** - List of available retailers
   - Returns: Array of retailer sources
   - Used by: UI components (informational only)

### Database Tables

- `crawler_sources` - Source configuration (API URL, filters, etc.)
- `crawler_type_mappings` - Maps API slugs to internal codes
- `zone_mappings` - Maps API zones to internal provinces
- `crawler_logs` - Sync operation logs
- `price_snapshots` - Actual price data

## Performance

- **Rate Limit:** 30 requests/minute (configured)
- **Timeout:** 30 seconds per request
- **Typical Response:** 100-200 products per sync
- **Sync Duration:** 2-5 seconds

## Next Steps

1. ✅ Run migrations 013 and 014
2. ✅ Verify setup with SQL queries above
3. ✅ Test the crawler with a manual sync
4. ✅ Check `crawler_logs` for results
5. ✅ Add more type mappings as needed
6. 📅 Set up cron job for automatic syncing
7. 📅 Implement UI components for easier management
