# UI Product Name Display Guide

## Overview

Each retailer uses different names for similar products. The `product_name` field stores the specific name from each retailer, ensuring accurate display in the UI.

## Why This Matters

### Before (Generic Display)
```tsx
// Shows only generic product type
<div>{price.productType}</div>
// Output: "VANG_MIENG" ❌ Not user-friendly
```

### After (Retailer-Specific Display)
```tsx
// Shows specific product name from retailer
<div>{price.productName || price.productType}</div>
// Output: "Vàng miếng SJC theo lượng" ✅ Clear and specific
```

---

## Examples by Retailer

### Gold Bars (VANG_MIENG)

| Retailer | Product Name | Product Type |
|----------|--------------|--------------|
| SJC | "Vàng miếng SJC theo lượng" | VANG_MIENG |
| PNJ | "Vàng miếng SJC PNJ" | VANG_MIENG |
| DOJI | "Vàng miếng DOJI lẻ" | VANG_MIENG |
| BTMC | "Vàng miếng Rồng Thăng Long" | VANG_MIENG |

All have the same `product_type`, but different `product_name` values.

### Gold Rings (VANG_NHAN)

| Retailer | Product Name | Product Type |
|----------|--------------|--------------|
| SJC | "Vàng nhẫn SJC 9999 theo chỉ" | VANG_NHAN |
| PNJ | "Vàng nhẫn trơn 9999" | VANG_NHAN |
| DOJI | "Nhẫn Tròn 9999 Hưng Thịnh Vượng" | VANG_NHAN |
| BTMC | "Vàng nhẫn trơn BTMC" | VANG_NHAN |

---

## UI Component Examples

### 1. Price Card Component

```tsx
interface PriceCardProps {
  price: PriceData;
}

export function PriceCard({ price }: PriceCardProps) {
  // Get product type label for fallback
  const productTypeLabel = PRODUCT_TYPES.find(
    pt => pt.value === price.productType
  )?.label;

  return (
    <div className="rounded-lg border p-4">
      {/* Display specific product name */}
      <h3 className="font-semibold">
        {price.productName || productTypeLabel || price.productType}
      </h3>

      {/* Retailer */}
      <p className="text-sm text-muted-foreground">
        {price.retailer}
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

### 2. Price Table Component

```tsx
export function PriceTable({ prices }: { prices: PriceData[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>Nhà bán</th>
          <th>Mua vào</th>
          <th>Bán ra</th>
        </tr>
      </thead>
      <tbody>
        {prices.map((price) => {
          // Display specific product name
          const displayName = price.productName ||
                             PRODUCT_TYPES.find(pt => pt.value === price.productType)?.label ||
                             price.productType;

          return (
            <tr key={price.id}>
              <td className="font-medium">{displayName}</td>
              <td>{price.retailer}</td>
              <td>{formatCurrency(price.buyPrice)}</td>
              <td>{formatCurrency(price.sellPrice)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

### 3. Price Comparison Component

```tsx
export function PriceComparison({ productType }: { productType: ProductType }) {
  const [prices, setPrices] = useState<PriceData[]>([]);

  useEffect(() => {
    // Fetch prices for this product type
    fetchPrices({ productType }).then(setPrices);
  }, [productType]);

  // Group by product name to show variations
  const groupedPrices = prices.reduce((acc, price) => {
    const key = price.productName || price.productType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(price);
    return acc;
  }, {} as Record<string, PriceData[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedPrices).map(([productName, priceList]) => (
        <div key={productName} className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">{productName}</h3>
          <div className="grid gap-2">
            {priceList.map(price => (
              <div key={price.id} className="flex justify-between">
                <span>{price.retailer} - {price.province}</span>
                <span className="font-bold">
                  {formatCurrency(price.buyPrice)} / {formatCurrency(price.sellPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4. Filter/Search Component

```tsx
export function ProductFilter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [prices, setPrices] = useState<PriceData[]>([]);

  // Filter by product name
  const filteredPrices = prices.filter(price => {
    const searchableText = [
      price.productName,
      price.retailer,
      price.province,
    ].join(" ").toLowerCase();

    return searchableText.includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Tìm kiếm sản phẩm (ví dụ: Nhẫn Tròn, Rồng Thăng Long...)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />

      <div className="mt-4">
        {filteredPrices.map(price => (
          <PriceCard key={price.id} price={price} />
        ))}
      </div>
    </div>
  );
}
```

### 5. Dropdown/Select Component

```tsx
export function ProductSelector({ onSelect }: { onSelect: (name: string) => void }) {
  const [products, setProducts] = useState<string[]>([]);

  useEffect(() => {
    // Fetch unique product names
    fetch('/api/prices/products')
      .then(res => res.json())
      .then(data => {
        // Get unique product names
        const uniqueNames = [...new Set(
          data.prices
            .map((p: PriceData) => p.productName)
            .filter(Boolean)
        )];
        setProducts(uniqueNames);
      });
  }, []);

  return (
    <select onChange={(e) => onSelect(e.target.value)} className="border rounded px-4 py-2">
      <option value="">Chọn sản phẩm</option>
      {products.map(name => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
```

---

## API Query Examples

### Fetch Prices with Product Names

```tsx
// Fetch latest prices with product names
async function fetchLatestPrices() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return data.map(snapshotToPriceData);
}

// Use in component
const prices = await fetchLatestPrices();
prices.forEach(price => {
  console.log(`${price.retailer}: ${price.productName}`);
  // Output: "SJC: Vàng miếng SJC theo lượng"
  // Output: "DOJI: Nhẫn Tròn 9999 Hưng Thịnh Vượng"
});
```

### Filter by Product Name

```tsx
async function searchProducts(searchTerm: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .ilike('product_name', `%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(snapshotToPriceData);
}

// Search for "Nhẫn"
const rings = await searchProducts('Nhẫn');
// Returns all products with "Nhẫn" in the name
```

### Group by Product Name

```tsx
async function getPricesByProduct() {
  const supabase = createClient();

  // Get latest price for each unique product
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by product name
  const grouped = data.reduce((acc, price) => {
    const key = price.product_name || price.product_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(price);
    return acc;
  }, {} as Record<string, PriceSnapshot[]>);

  return grouped;
}
```

---

## Best Practices

### 1. Always Provide Fallback

```tsx
// ✅ Good - fallback to product type label
const displayName = price.productName ||
                   PRODUCT_TYPES.find(pt => pt.value === price.productType)?.label ||
                   price.productType;

// ❌ Bad - might show undefined
const displayName = price.productName;
```

### 2. Use for User-Facing Text Only

```tsx
// ✅ Good - use for display
<h3>{price.productName}</h3>

// ✅ Good - use product type for filtering
const goldBars = prices.filter(p => p.productType === 'VANG_MIENG');

// ❌ Bad - don't filter by product name (inconsistent)
const goldBars = prices.filter(p => p.productName?.includes('miếng'));
```

### 3. Display Full Context

```tsx
// ✅ Good - shows retailer + product name
<div>
  <span className="font-semibold">{price.productName}</span>
  <span className="text-sm text-muted-foreground"> - {price.retailer}</span>
</div>
// Output: "Vàng miếng SJC theo lượng - SJC"

// ❌ Less clear - only product name
<div>{price.productName}</div>
// Output: "Vàng miếng SJC theo lượng" (which retailer?)
```

### 4. Handle Null/Undefined

```tsx
// ✅ Good - safe access
{price.productName && <h3>{price.productName}</h3>}

// ✅ Good - with fallback
<h3>{price.productName || 'Tên sản phẩm không có'}</h3>

// ❌ Bad - might crash
<h3>{price.productName.toUpperCase()}</h3>
```

---

## Testing

After running migration 016, test the display:

```sql
-- Check that product names are saved
SELECT
  retailer,
  product_type,
  product_name,
  COUNT(*) as price_count
FROM price_snapshots
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY retailer, product_type, product_name
ORDER BY retailer, product_type;
```

Expected output:
```
retailer | product_type | product_name                      | price_count
---------+--------------+-----------------------------------+------------
SJC      | VANG_MIENG   | Vàng miếng SJC theo lượng        | 10
SJC      | VANG_NHAN    | Vàng nhẫn SJC 9999 theo chỉ      | 8
PNJ      | VANG_MIENG   | Vàng miếng SJC PNJ               | 12
DOJI     | VANG_NHAN    | Nhẫn Tròn 9999 Hưng Thịnh Vượng  | 15
```

---

## Summary

✅ **Migration 016** adds `product_name` column to store retailer-specific names
✅ **All crawlers updated** to save product names from type mappings
✅ **Type system updated** to include `productName` field
✅ **UI components** should display `productName` for user-facing text
✅ **Fallback chain**: `productName` → `productType.label` → `productType` code
✅ **Grouping/filtering** should still use `productType` for consistency

Now your UI will show the exact product names from each retailer! 🎉
