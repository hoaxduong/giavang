# Retailer-Specific Products Guide

## Overview

Products are now **retailer-specific** - each retailer manages their own product catalog independently. This allows each retailer to have different products with different names, categories, and configurations.

## Why Retailer-Specific Products?

### Old System ❌
```
Global Product Types:
├── VANG_MIENG (used by SJC, PNJ, DOJI, BTMC...)
├── VANG_NHAN (used by SJC, PNJ, DOJI...)
└── NU_TRANG (used by all...)

Problems:
- Generic product types don't capture retailer-specific products
- No way to enable/disable products per retailer
- Can't have retailer-specific metadata
```

### New System ✅
```
SJC Products:
├── MIENG_1L: "Vàng miếng SJC theo lượng" (enabled)
├── MIENG_5C: "Vàng SJC 5 chỉ" (enabled)
└── NHAN_9999: "Vàng nhẫn SJC 9999 theo chỉ" (disabled)

PNJ Products:
├── MIENG_SJC: "Vàng miếng SJC PNJ" (enabled)
├── MIENG_PHUONG_HOANG: "Vàng miếng PNJ - Phượng Hoàng" (enabled)
└── NHAN_TRON: "Vàng nhẫn trơn 9999" (enabled)

DOJI Products:
├── MIENG_LE: "Vàng miếng DOJI lẻ" (enabled)
└── NHAN_HUNG_THINH_VUONG: "Nhẫn Tròn 9999 Hưng Thịnh Vượng" (enabled)

Benefits:
✅ Each retailer has their own product catalog
✅ Enable/disable products per retailer
✅ Retailer-specific product codes and names
✅ Can add metadata per product (purity, weight, etc.)
```

---

## Database Structure

### retailer_products Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| retailer_code | VARCHAR(50) | FK to retailers (e.g., "SJC", "PNJ") |
| product_code | VARCHAR(100) | Unique code within retailer (e.g., "MIENG_1L") |
| product_name | VARCHAR(200) | Display name (e.g., "Vàng miếng SJC theo lượng") |
| category | VARCHAR(50) | Optional category (vang_mieng, vang_nhan, nu_trang) |
| description | TEXT | Optional description |
| is_enabled | BOOLEAN | Enable/disable product |
| sort_order | INTEGER | Display order |
| metadata | JSONB | Additional product info |

**Unique Constraint:** `(retailer_code, product_code)` - Product codes are unique within each retailer

---

## Migration Details

### Migration 017

**File:** `supabase/migrations/017_retailer_specific_products.sql`

**What it does:**
1. ✅ Creates `retailer_products` table
2. ✅ Adds `retailer_product_id` to `crawler_type_mappings`
3. ✅ Adds `retailer_product_id` to `price_snapshots`
4. ✅ Migrates existing data from type mappings to retailer products
5. ✅ Creates views for easy querying
6. ✅ Adds trigger to auto-link new prices to products

**Auto-Migration:**
- Existing type mappings → retailer products
- Product names and categories preserved
- All mappings linked to their retailer products

---

## API Endpoints

### List Products for a Retailer
```http
GET /api/admin/retailers/{retailerCode}/products

Example: GET /api/admin/retailers/SJC/products
```

Response:
```json
{
  "retailer": {
    "code": "SJC",
    "name": "SJC"
  },
  "products": [
    {
      "id": "uuid...",
      "retailerCode": "SJC",
      "productCode": "MIENG_1L",
      "productName": "Vàng miếng SJC theo lượng",
      "category": "vang_mieng",
      "isEnabled": true,
      "sortOrder": 0
    },
    ...
  ]
}
```

### Create a New Product
```http
POST /api/admin/retailers/{retailerCode}/products

Body:
{
  "productCode": "NHAN_2C",
  "productName": "Vàng nhẫn SJC 2 chỉ",
  "category": "vang_nhan",
  "isEnabled": true,
  "sortOrder": 10,
  "metadata": {
    "purity": "9999",
    "weight": "2_chi"
  }
}
```

### Update a Product
```http
PUT /api/admin/retailers/{retailerCode}/products/{productId}

Body:
{
  "isEnabled": false,
  "sortOrder": 20
}
```

### Delete a Product
```http
DELETE /api/admin/retailers/{retailerCode}/products/{productId}
```

---

## SQL Examples

### View All Products by Retailer

```sql
SELECT
  retailer_code,
  product_code,
  product_name,
  category,
  is_enabled
FROM retailer_products
ORDER BY retailer_code, sort_order, product_name;
```

### View SJC Products Only

```sql
SELECT
  product_code,
  product_name,
  category,
  is_enabled
FROM retailer_products
WHERE retailer_code = 'SJC'
ORDER BY sort_order, product_name;
```

### Count Products per Retailer

```sql
SELECT
  retailer_code,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE is_enabled) as enabled_products
FROM retailer_products
GROUP BY retailer_code
ORDER BY retailer_code;
```

### View Product Catalog with Latest Prices

```sql
-- Use the built-in view
SELECT
  retailer_code,
  product_name,
  category,
  is_enabled,
  last_price_update,
  latest_buy_price,
  latest_sell_price
FROM retailer_product_catalog
WHERE retailer_code = 'SJC'
ORDER BY sort_order;
```

---

## UI Component Examples

### Product List by Retailer

```tsx
import { useState, useEffect } from 'react';
import type { RetailerProduct } from '@/lib/types';

export function RetailerProductList({ retailerCode }: { retailerCode: string }) {
  const [products, setProducts] = useState<RetailerProduct[]>([]);

  useEffect(() => {
    fetch(`/api/admin/retailers/${retailerCode}/products`)
      .then(res => res.json())
      .then(data => setProducts(data.products));
  }, [retailerCode]);

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold">
        Products for {retailerCode}
      </h2>

      <table className="w-full">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>{product.productName}</td>
              <td>{product.category}</td>
              <td>
                {product.isEnabled ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-gray-400">Disabled</span>
                )}
              </td>
              <td>
                <button onClick={() => toggleProduct(product)}>
                  {product.isEnabled ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Product Manager (Enable/Disable)

```tsx
export function ProductManager({ retailer }: { retailer: string }) {
  async function toggleProduct(product: RetailerProduct) {
    await fetch(
      `/api/admin/retailers/${retailer}/products/${product.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled: !product.isEnabled
        })
      }
    );
    // Refresh list
  }

  async function updateSortOrder(productId: string, newOrder: number) {
    await fetch(
      `/api/admin/retailers/${retailer}/products/${productId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          sortOrder: newOrder
        })
      }
    );
  }

  return (
    <div>
      {/* Product list with drag-and-drop sorting */}
      {/* Enable/disable toggles */}
      {/* Add new product form */}
    </div>
  );
}
```

### Price Display with Retailer Product

```tsx
export function PriceCard({ price }: { price: PriceData }) {
  const [product, setProduct] = useState<RetailerProduct | null>(null);

  useEffect(() => {
    if (price.retailerProductId) {
      // Fetch full product details if needed
      fetch(`/api/admin/retailers/${price.retailer}/products/${price.retailerProductId}`)
        .then(res => res.json())
        .then(data => setProduct(data.product));
    }
  }, [price.retailerProductId]);

  return (
    <div className="rounded-lg border p-4">
      {/* Display product name (from price data) */}
      <h3 className="font-semibold">
        {price.productName}
      </h3>

      {/* Display category if product loaded */}
      {product && (
        <span className="text-sm text-muted-foreground">
          {product.category}
        </span>
      )}

      {/* Retailer and province */}
      <p className="text-sm">
        {price.retailer} - {price.province}
      </p>

      {/* Prices */}
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs">Mua vào</span>
          <p className="text-lg font-bold">
            {formatCurrency(price.buyPrice)}
          </p>
        </div>
        <div>
          <span className="text-xs">Bán ra</span>
          <p className="text-lg font-bold">
            {formatCurrency(price.sellPrice)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Working with Categories

Products can optionally have categories for grouping:

### Standard Categories

- `vang_mieng` - Gold bars/bullion
- `vang_nhan` - Gold rings
- `nu_trang` - Jewelry/ornaments
- `vang_khac` - Specialty gold items
- `bac` - Silver

### Filter by Category

```sql
-- Get all gold bars across all retailers
SELECT *
FROM retailer_products
WHERE category = 'vang_mieng'
  AND is_enabled = true
ORDER BY retailer_code, product_name;

-- Get all rings from SJC
SELECT *
FROM retailer_products
WHERE retailer_code = 'SJC'
  AND category = 'vang_nhan'
ORDER BY product_name;
```

### Group Products by Category (UI)

```tsx
const productsByCategory = products.reduce((acc, product) => {
  const category = product.category || 'other';
  if (!acc[category]) acc[category] = [];
  acc[category].push(product);
  return acc;
}, {} as Record<string, RetailerProduct[]>);

// Display grouped
{Object.entries(productsByCategory).map(([category, items]) => (
  <div key={category}>
    <h3>{categoryNames[category]}</h3>
    {items.map(product => <ProductItem key={product.id} product={product} />)}
  </div>
))}
```

---

## Managing Product Metadata

Products can store additional metadata in JSONB format:

```sql
-- Add metadata to a product
UPDATE retailer_products
SET metadata = jsonb_build_object(
  'purity', '9999',
  'weight_unit', 'chi',
  'min_weight', 1,
  'max_weight', 10,
  'bar_type', 'standard'
)
WHERE retailer_code = 'SJC' AND product_code = 'MIENG_1L';

-- Query products by metadata
SELECT *
FROM retailer_products
WHERE metadata->>'purity' = '9999';

-- Products with specific weight range
SELECT *
FROM retailer_products
WHERE (metadata->>'min_weight')::int >= 5;
```

---

## Best Practices

### 1. Product Codes

```
✅ Good product codes:
- MIENG_1L (clear, descriptive)
- NHAN_9999_5C (includes purity and weight)
- TRANG_SUC_RDL (abbreviated retailer brand)

❌ Bad product codes:
- PROD1 (not descriptive)
- vàng-miếng (use English, underscores)
- PRODUCT_CODE_THAT_IS_WAY_TOO_LONG (keep it concise)
```

### 2. Product Names

```
✅ Good product names:
- "Vàng miếng SJC theo lượng" (exact retailer name)
- "Nhẫn Tròn 9999 Hưng Thịnh Vượng" (descriptive)
- "Vàng miếng PNJ - Phượng Hoàng" (includes brand)

✅ Use exact names from retailer's website/API
✅ Include purity/weight if relevant
✅ Keep consistent naming within each retailer
```

### 3. Categories

```
✅ Use categories for high-level grouping
✅ Keep category names consistent (lowercase, underscore)
✅ Don't create too many categories (5-10 max)

Categories are optional - only use if helpful for your UI
```

### 4. Enable/Disable

```
✅ Disable products temporarily (don't delete)
✅ Use for seasonal products or out-of-stock items
✅ Check is_enabled in queries for active products only
```

---

## Migration Checklist

After running migration 017:

- [ ] Check retailer products were created:
  ```sql
  SELECT COUNT(*) FROM retailer_products;
  ```

- [ ] Verify type mappings are linked:
  ```sql
  SELECT COUNT(*) FROM crawler_type_mappings WHERE retailer_product_id IS NOT NULL;
  ```

- [ ] Test API endpoints:
  ```bash
  curl /api/admin/retailers/SJC/products
  ```

- [ ] Update UI to show products per retailer

- [ ] Test enabling/disabling products

- [ ] Verify prices are linked to products:
  ```sql
  SELECT COUNT(*) FROM price_snapshots WHERE retailer_product_id IS NOT NULL;
  ```

---

## Summary

✅ **Products are now retailer-specific** - each retailer manages their own catalog
✅ **Migration 017** automatically converts existing data
✅ **API endpoints** for CRUD operations on products
✅ **Flexible structure** with categories and metadata
✅ **Enable/disable per product** for granular control
✅ **Backward compatible** - old product_type still works during transition

Each retailer can now have their own products with their own names, making the system much more flexible and accurate! 🎉
