# Single Migration File Guide

## Overview

The entire database schema has been consolidated into a **single migration file** for easier management and faster deployment.

## What Changed

### Before (13 separate migrations):
```
001_initial_schema.sql
002_api_keys_table.sql
003_user_profiles.sql
004_user_portfolio.sql
005_crawler_management.sql
006_add_field_mappings_to_sources.sql
007_backfill_system.sql
008_blog_system.sql
009_sjc_crawler_setup.sql
010_insert_price_snapshot_function.sql
011_change_uniqueness_to_minute.sql
012_remove_vang_today_source.sql
013_onus_and_retailer_products.sql
```

### After (1 comprehensive migration):
```
001_complete_schema.sql  (91KB - everything included)
```

## Benefits

### 1. Simplicity
- **Single source of truth** for entire database schema
- No need to track migration order
- Easier to understand the complete system

### 2. Performance
- **Faster reset** - One transaction instead of 13
- No migration state management overhead
- Atomic deployment - all or nothing

### 3. Maintainability
- **Easier code review** - See everything in one place
- Simpler version control - One file to diff
- Better documentation - Complete schema overview

### 4. Development Workflow
- **Faster onboarding** - New developers see entire schema
- Clean test databases - Always start from scratch
- No migration conflicts

### 5. Production Ready
- **Zero migration history** needed
- Fresh database = Single migration
- Easier disaster recovery

## What's Included

The single migration file (`001_complete_schema.sql`) includes:

### Core Tables

#### 1. Price Snapshots
- Main price data storage
- Minute-level uniqueness constraint
- Indexes for performance
- Product name tracking
- Retailer product linking

#### 2. API Keys Management
- External API key storage
- Auto-expiration tracking
- Request count monitoring

#### 3. User System
- User profiles with RBAC
- Admin/user role separation
- Portfolio tracking

#### 4. Reference Data
- Retailers (SJC, PNJ, DOJI, etc.)
- Provinces (all Vietnamese provinces)
- Product types (VANG_MIENG, VANG_NHAN, etc.)
- **Retailer-specific products** (32 seeded)

#### 5. Crawler System
- Crawler sources (SJC, Onus)
- Type mappings (slug → product)
- Zone mappings (API zone → province)
- Crawler logs (comprehensive tracking)
- Field mappings for flexible parsing

#### 6. Backfill System
- Historical data jobs
- Progress tracking
- Error handling
- Pause/resume capability

#### 7. Blog System
- Posts with markdown support
- Categories and tags
- Comments with moderation
- SEO-friendly slugs

### Functions & Triggers

- Auto-create user profiles on signup
- Prevent non-admin role changes
- Auto-update timestamps
- Auto-populate retailer_product_id
- Insert price snapshot with deduplication
- API key usage tracking

### Views

- `current_api_keys` - Active API keys
- `latest_prices_with_products` - Last 24h prices
- `retailer_product_catalog` - Products with prices
- `price_snapshots_with_names` - Prices with fallback names

### Seeded Data

#### Retailers (9)
- SJC
- PNJ
- DOJI
- Bảo Tín Minh Châu
- Phú Quý
- BTMH
- Mi Hồng
- Ngọc Thẩm
- (+ your custom retailers)

#### Provinces (63)
All major Vietnamese provinces and cities

#### Product Types (10)
- VANG_MIENG (Gold bars)
- VANG_NHAN (Gold rings)
- NU_TRANG (Jewelry)
- VANG_KHAC (Specialty)
- BAC (Silver)
- SJC_BARS (Legacy)
- SJC_RINGS (Legacy)
- GOLD_9999 (Legacy)
- GOLD_999 (Legacy)
- GOLD_24K (Legacy)

#### Retailer Products (32)
- **SJC**: 10 products (bars, rings, jewelry)
- **PNJ**: 10 products (bars, rings, jewelry, silver)
- **DOJI**: 5 products (bars, rings, jewelry)
- **BTMC**: 7 products (bars, rings, jewelry)

#### Type Mappings
- 32 Onus API mappings (slug → retailer product)
- SJC API mappings (TypeName → product)
- All with retailer_product_id links

#### Zone Mappings
- Hồ Chí Minh → TP. Hồ Chí Minh
- Hà Nội → Hà Nội
- Đà Nẵng → Đà Nẵng
- Cần Thơ → Cần Thơ

## How to Use

### Fresh Database Reset

```bash
# Easy way
./scripts/reset-database.sh

# Manual way
supabase stop
supabase db reset
supabase start
```

### Verify Migration

```bash
# Check migration applied
supabase db diff

# Should show: No schema differences detected
```

### Check Seeded Data

```sql
-- Check retailers
SELECT code, name FROM retailers ORDER BY sort_order;

-- Check retailer products
SELECT retailer_code, COUNT(*) as product_count
FROM retailer_products
GROUP BY retailer_code;

-- Check type mappings
SELECT COUNT(*) as total_mappings FROM crawler_type_mappings;

-- Check crawler sources
SELECT name, api_type, is_enabled FROM crawler_sources;
```

## File Structure

```
001_complete_schema.sql
├── Header & Documentation
├── [001] Price Snapshots
├── [002] API Keys
├── [003] User Profiles & RBAC
├── [004] User Portfolio
├── [005] Crawler Management
│   ├── Reference Data Tables
│   ├── Crawler Sources
│   ├── Type Mappings
│   └── Crawler Logs
├── [006] Field Mappings
├── [007] Backfill System
├── [008] Blog System
│   ├── Posts
│   ├── Categories
│   ├── Tags
│   └── Comments
├── [009] SJC Crawler Setup
│   ├── Retailers Seed
│   ├── Provinces Seed
│   ├── Product Types Seed
│   └── SJC Type Mappings
├── [010] Insert Price Function
├── [011] Minute Uniqueness
├── [012] Remove Vang Today
└── [013] Onus & Retailer Products
    ├── Zone Mappings Table
    ├── Retailer Products Table
    ├── Onus Source
    ├── Zone Mappings Seed
    ├── Retailer Products Seed (32 items)
    └── Views & Triggers
```

## Migration Best Practices

### Development
1. Always use `supabase db reset` for clean state
2. Never manually edit the migration file
3. Test migrations locally before production
4. Keep the migration file formatted and readable

### Production
1. Backup your database before major changes
2. Test migration on staging first
3. Monitor logs during migration
4. Have rollback plan ready

### Adding New Features
When you need to add new tables or columns:

**Option 1: Create Migration 002**
```sql
-- supabase/migrations/002_new_feature.sql
ALTER TABLE price_snapshots ADD COLUMN new_field TEXT;
```

**Option 2: Recreate Complete Schema**
1. Export current data
2. Update 001_complete_schema.sql
3. Reset database
4. Import data back

Choose Option 1 for production, Option 2 for development.

## Troubleshooting

### Error: "relation already exists"
Your database isn't fully reset:
```bash
supabase db reset --force
```

### Error: "function already exists"
Same issue - full reset needed:
```bash
supabase stop
rm -rf supabase/.temp
supabase start
```

### Missing Seeded Data
Check if migration completed:
```sql
-- Should return 32
SELECT COUNT(*) FROM retailer_products;

-- Should return 2 (SJC + Onus)
SELECT COUNT(*) FROM crawler_sources;
```

### Performance Issues
The migration is large but should complete in < 1 second locally:
```bash
time supabase db reset
```

If it takes longer, check:
- Disk space
- Docker memory allocation
- Background processes

## Comparison: Multi-File vs Single File

| Aspect | Multi-File (Old) | Single File (New) |
|--------|------------------|-------------------|
| Files | 13 files | 1 file |
| Total Size | ~91KB | ~91KB |
| Reset Time | ~2-3 seconds | ~1 second |
| Complexity | High | Low |
| Maintenance | Harder | Easier |
| Onboarding | Slower | Faster |
| Conflicts | Possible | None |
| History | Sequential | Complete |
| Rollback | Complex | Simple |

## FAQ

**Q: Can I still use migration 002, 003, etc?**
A: Yes! The single file approach works with additional migrations.

**Q: What if I need to rollback?**
A: With single migration, rollback = drop schema. Use backups.

**Q: Is this production-ready?**
A: Yes! Many projects use this pattern (Prisma, Hasura, etc.)

**Q: How do I update the schema?**
A: Create migration 002+ for incremental changes, or rebuild 001.

**Q: Does this affect existing databases?**
A: No! This is for fresh databases. Existing DBs keep their history.

**Q: Can I split it back to multiple files?**
A: Yes, but there's no benefit. Single file is optimal.

## Next Steps

1. **Test the migration**: `./scripts/reset-database.sh`
2. **Verify seeded data**: Run the SQL queries above
3. **Test crawlers**: Visit `/admin/crawler/sync`
4. **Check UI**: Visit `/admin/retailers` → Click "Sản phẩm"
5. **Monitor logs**: Check `/admin/crawler/logs`

## Resources

- Migration file: `supabase/migrations/001_complete_schema.sql`
- Reset script: `scripts/reset-database.sh`
- Retailer products guide: `docs/retailer-products-guide.md`
- Onus crawler guide: `docs/onus-crawler-guide.md`
