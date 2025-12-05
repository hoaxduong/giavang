# Database Migration Optimization

## Overview

The database migrations have been optimized by consolidating migrations 013-017 into a single, efficient migration file.

## What Changed

### Before (5 separate migrations):
```
013_onus_crawler_setup.sql          - Onus crawler, zone mappings
014_onus_initial_type_mappings.sql  - Initial product mappings
015_update_product_types_for_onus.sql - New product types
016_add_product_name_to_snapshots.sql - Product name column
017_retailer_specific_products.sql   - Retailer products system
```

### After (1 consolidated migration):
```
013_onus_and_retailer_products.sql  - Everything in one file
```

## Benefits

1. **Cleaner Migration History** - Easier to understand and maintain
2. **Faster Execution** - Single transaction, no overhead between migrations
3. **Atomic Operations** - All changes succeed or fail together
4. **Better Data Integrity** - No intermediate states
5. **Easier Rollback** - Single point of failure/recovery

## What's Included

The consolidated migration includes:

### 1. New Retailers
- BTMH (Bảo Tín Mạnh Hải)
- Ngọc Thẩm

### 2. New Product Types (Onus-Style)
- VANG_MIENG (Gold bars)
- VANG_NHAN (Gold rings)
- NU_TRANG (Jewelry)
- VANG_KHAC (Specialty gold)
- BAC (Silver)

### 3. New Tables
- `zone_mappings` - Maps API zones to provinces
- `retailer_products` - Retailer-specific product catalog

### 4. Schema Updates
- Added `retailer_filter` to `crawler_sources`
- Added `product_name` to `price_snapshots`
- Added `retailer_product_id` to `price_snapshots`
- Added `retailer_product_id` to `crawler_type_mappings`

### 5. Data Seeding
- Onus crawler source
- Zone mappings (HCM, HN, DN, CT)
- **32 retailer products** with type mappings:
  - SJC: 10 products
  - PNJ: 10 products
  - DOJI: 5 products
  - Bảo Tín Minh Châu: 7 products

### 6. Views
- `latest_prices_with_products` - Latest 24h prices
- `retailer_product_catalog` - Product catalog with prices
- `price_snapshots_with_names` - Prices with product names

### 7. Triggers
- Auto-update `updated_at` on zone_mappings
- Auto-update `updated_at` on retailer_products
- Auto-populate `retailer_product_id` in price_snapshots

## How to Reset Your Database

### Option 1: Using the Script (Recommended)
```bash
./scripts/reset-database.sh
```

### Option 2: Manual Commands
```bash
# Stop Supabase
supabase stop

# Reset database (applies all migrations)
supabase db reset

# Start Supabase
supabase start
```

## Post-Reset Checklist

After resetting your database:

- [ ] Verify all 13 migrations applied successfully
- [ ] Check that all tables exist:
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```
- [ ] Verify retailer products were seeded:
  ```sql
  SELECT retailer_code, COUNT(*)
  FROM retailer_products
  GROUP BY retailer_code;
  ```
- [ ] Test Onus crawler source exists:
  ```sql
  SELECT * FROM crawler_sources WHERE api_type = 'onus';
  ```
- [ ] Run a manual Onus sync to test
- [ ] Check the admin UI at `/admin/retailers/[code]/products`

## Migration Details

### Retailer Products Seeded

| Retailer | Products | Categories |
|----------|----------|------------|
| SJC | 10 | Miếng (4), Nhẫn (2), Nữ trang (4) |
| PNJ | 10 | Miếng (4), Nhẫn (1), Nữ trang (4), Bạc (1) |
| DOJI | 5 | Miếng (3), Nhẫn (1), Nữ trang (1) |
| BTMC | 7 | Miếng (1), Nhẫn (2), Nữ trang (4) |

### Type Mappings Created

All 32 products are linked to Onus API slugs via `crawler_type_mappings`:
- Each mapping connects an Onus slug to a retailer product
- Province is NULL (uses zone mapping from API)
- All mappings are enabled by default

## Troubleshooting

### Error: "relation already exists"
If you see this error, it means your database isn't fully reset. Run:
```bash
supabase db reset --force
```

### Error: "Onus crawler source not found"
This means migration 013 didn't complete. Check migration logs:
```bash
supabase db reset
```

### Missing Products
If retailer products aren't created, check the migration output:
```sql
-- Should return 32
SELECT COUNT(*) FROM retailer_products;
```

## Next Steps

After successful reset:

1. **Test the UI**: Visit `/admin/retailers` and click "Sản phẩm" for any retailer
2. **Run Onus Sync**: Test the crawler from `/admin/crawler/sync`
3. **Add More Products**: Use the UI to add more retailer-specific products
4. **Monitor Logs**: Check `/admin/crawler/logs` for any issues

## Rollback Plan

If you need to rollback to the old system:

1. Restore from backup (if you created one)
2. Or manually recreate the old migrations from git history
3. Or continue forward - the new system is backward compatible

## Questions?

- Check the [Retailer Products Guide](./retailer-products-guide.md)
- Check the [Onus Crawler Guide](./onus-crawler-guide.md)
- Review migration file: `supabase/migrations/013_onus_and_retailer_products.sql`
