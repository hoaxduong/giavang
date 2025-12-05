# Product Types Update Guide

## Overview

The product type system has been updated to match **Onus's categorization**, which is simpler and more intuitive than the previous system.

## What Changed?

### Old Product Types (SJC-focused)
```
SJC_BARS     → Vàng miếng SJC
SJC_RINGS    → Vàng nhẫn SJC
GOLD_9999    → Vàng 9999
GOLD_999     → Vàng 999
GOLD_24K     → Vàng 24K
```

**Problems:**
- Too specific to SJC
- Mixed purity levels with product categories
- Doesn't fit multi-retailer products from Onus

### New Product Types (Onus-style)
```
VANG_MIENG   → Vàng miếng (Gold bars/bullion)
VANG_NHAN    → Vàng nhẫn (Gold rings)
NU_TRANG     → Nữ trang (Jewelry/ornaments)
VANG_KHAC    → Vàng khác (Specialty gold items)
BAC          → Bạc (Silver)
```

**Benefits:**
- ✅ Matches Onus categorization exactly
- ✅ Works for all retailers (SJC, PNJ, DOJI, etc.)
- ✅ Simpler and more intuitive
- ✅ Separates category from purity (purity is in the label)
- ✅ Room for expansion (silver, specialty items)

---

## Migration Details

### Migration 015

**File:** `supabase/migrations/015_update_product_types_for_onus.sql`

**What it does:**
1. ✅ Adds 5 new product types (VANG_MIENG, VANG_NHAN, NU_TRANG, VANG_KHAC, BAC)
2. ✅ Updates all Onus type mappings to use new product types
3. ✅ Keeps old types enabled for SJC crawler backward compatibility
4. ✅ Shows summary of products in each new category

**Run the migration:**
```bash
# Apply migration 015
# It will automatically update all existing Onus mappings
```

---

## Product Type Breakdown

### 1. VANG_MIENG (Vàng miếng) - Gold Bars

**Description:** Gold bullion bars, the most traditional form of gold investment

**Examples from Onus:**
- Vàng miếng SJC theo lượng
- Vàng SJC 5 chỉ, 2 chỉ, 1 chỉ
- Vàng miếng SJC PNJ
- Vàng miếng PNJ - Phượng Hoàng
- Vàng miếng DOJI lẻ
- Vàng miếng Rồng Thăng Long (BTMC)
- Vàng miếng SJC BTMC

**Retailers:** SJC, PNJ, DOJI, BTMC, Phú Quý, Mi Hồng, Ngọc Thẩm

**Count:** ~9 products in initial mappings

---

### 2. VANG_NHAN (Vàng nhẫn) - Gold Rings

**Description:** Gold rings, popular for both jewelry and investment

**Examples from Onus:**
- Vàng nhẫn SJC 9999 theo chỉ
- Vàng nhẫn SJC 9999 theo phân
- Vàng nhẫn trơn 9999 (PNJ)
- Nhẫn Tròn 9999 Hưng Thịnh Vượng (DOJI)
- Vàng nhẫn trơn BTMC

**Retailers:** SJC, PNJ, DOJI, BTMC, Phú Quý

**Count:** ~5 products in initial mappings

---

### 3. NU_TRANG (Nữ trang) - Jewelry

**Description:** Gold jewelry and ornaments, includes various purity levels

**Examples from Onus:**
- Trang sức vàng SJC 9999
- Vàng trang sức SJC 99%
- Nữ trang 68%, 41,7%
- Vàng Kim Bảo 9999 (PNJ)
- Vàng Phúc Lộc Tài 9999 (PNJ)
- Vàng Trang sức 9999, 24K, 99 (PNJ)
- Vàng 14K, 18K (PNJ)
- Nữ trang 9999, 999, 99 (DOJI)
- Trang sức vàng Rồng Thăng Long (BTMC)

**Purities:** 9999, 999, 99, 68%, 41.7%, 24K, 18K, 14K

**Retailers:** SJC, PNJ, DOJI, BTMC, Phú Quý, Mi Hồng

**Count:** ~16 products in initial mappings

---

### 4. VANG_KHAC (Vàng khác) - Specialty Gold

**Description:** Specialty gold items that don't fit standard categories

**Examples from Onus:**
- Bản vị vàng BTMC
- Gold coins
- Designer pieces
- Commemorative items

**Count:** ~1 product in initial mappings (more can be added)

---

### 5. BAC (Bạc) - Silver

**Description:** Silver products

**Examples from Onus:**
- Bạc 99.9 (Phú Quý)

**Count:** Ready for silver products (not in initial mappings)

---

## How Product Types Are Now Used

### In Type Mappings

```sql
-- Old way (mixed purity + category)
external_code: "nu-trang-9999"
product_type: "GOLD_9999"  ❌ Confusing - is it bars, rings, or jewelry?

-- New way (clear category)
external_code: "nu-trang-9999"
product_type: "NU_TRANG"   ✅ Clear - it's jewelry
label: "Trang sức vàng SJC 9999"  (purity is in the label)
```

### In Database Queries

```sql
-- Get all gold bars across all retailers
SELECT * FROM price_snapshots
WHERE product_type = 'VANG_MIENG'
ORDER BY created_at DESC;

-- Get all jewelry/ornaments
SELECT * FROM price_snapshots
WHERE product_type = 'NU_TRANG'
ORDER BY created_at DESC;

-- Get all rings
SELECT * FROM price_snapshots
WHERE product_type = 'VANG_NHAN'
ORDER BY created_at DESC;
```

### In UI Components

```tsx
// Filter by product category
const goldBars = prices.filter(p => p.productType === 'VANG_MIENG');
const rings = prices.filter(p => p.productType === 'VANG_NHAN');
const jewelry = prices.filter(p => p.productType === 'NU_TRANG');

// Display category name
import { PRODUCT_TYPES } from '@/lib/constants';

const category = PRODUCT_TYPES.find(pt => pt.value === 'VANG_MIENG');
console.log(category.label);      // "Vàng miếng"
console.log(category.shortLabel);  // "Miếng"
```

---

## Backward Compatibility

### SJC Crawler Still Works

The old product types (SJC_BARS, SJC_RINGS, GOLD_9999, etc.) are **still enabled** and work with the SJC crawler. They've just been moved to the bottom of the list (sort_order +100).

### Gradual Migration

You can migrate the SJC crawler mappings to use new product types gradually:

```sql
-- Example: Update SJC bars to use new VANG_MIENG type
UPDATE crawler_type_mappings
SET product_type_code = 'VANG_MIENG'
WHERE source_id = (SELECT id FROM crawler_sources WHERE api_type = 'sjc')
  AND product_type_code = 'SJC_BARS';

-- Example: Update SJC rings to use new VANG_NHAN type
UPDATE crawler_type_mappings
SET product_type_code = 'VANG_NHAN'
WHERE source_id = (SELECT id FROM crawler_sources WHERE api_type = 'sjc')
  AND product_type_code = 'SJC_RINGS';
```

---

## Verification

After running migration 015, verify the changes:

```sql
-- View new product types
SELECT code, label, short_label, is_enabled, sort_order
FROM product_types
ORDER BY sort_order;

-- View Onus mappings by new product type
SELECT
  pt.label as product_type,
  ctm.retailer_code,
  COUNT(*) as product_count,
  STRING_AGG(ctm.label, ', ') as products
FROM crawler_type_mappings ctm
JOIN crawler_sources cs ON cs.id = ctm.source_id
JOIN product_types pt ON pt.code = ctm.product_type_code
WHERE cs.api_type = 'onus'
GROUP BY pt.label, pt.sort_order, ctm.retailer_code
ORDER BY pt.sort_order, ctm.retailer_code;
```

**Expected Output:**
```
product_type  | retailer_code | product_count
--------------+---------------+--------------
Vàng miếng    | BTMC         | 2
Vàng miếng    | DOJI         | 1
Vàng miếng    | PNJ          | 2
Vàng miếng    | SJC          | 4
Vàng nhẫn     | BTMC         | 1
Vàng nhẫn     | DOJI         | 1
Vàng nhẫn     | PNJ          | 1
Vàng nhẫn     | SJC          | 2
Nữ trang      | BTMC         | 2
Nữ trang      | DOJI         | 3
Nữ trang      | PNJ          | 7
Nữ trang      | SJC          | 4
Vàng khác     | BTMC         | 1
```

---

## Adding New Products

When adding new Onus products, use the new product types:

```sql
-- Example: Add a new PNJ ring
INSERT INTO crawler_type_mappings (
  source_id,
  external_code,
  retailer_code,
  product_type_code,  -- Use new types!
  province_code,
  label,
  is_enabled
)
SELECT
  id,
  'new-pnj-ring-slug',
  'PNJ',
  'VANG_NHAN',  -- ✅ New type (not GOLD_9999)
  NULL,
  'Nhẫn trơn PNJ mới',
  true
FROM crawler_sources
WHERE api_type = 'onus';
```

---

## Summary

✅ **Migration 015** updates product types to match Onus categorization
✅ **5 new product types** added: VANG_MIENG, VANG_NHAN, NU_TRANG, VANG_KHAC, BAC
✅ **All Onus mappings** automatically updated to use new types
✅ **Old types kept** for SJC crawler backward compatibility
✅ **Simpler system** that works across all retailers
✅ **Future-ready** for silver and specialty items

The new system is cleaner, more intuitive, and better aligned with how Vietnamese consumers think about gold products! 🎉
