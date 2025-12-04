"use client";

import { useState } from "react";
import { PriceTable } from "@/components/prices/price-table";
import { WorldGoldPrice } from "@/components/prices/world-gold-price";
import { ProvinceFilter } from "@/components/prices/province-filter";
import { RetailerFilter } from "@/components/prices/retailer-filter";
import { ProductTypeFilter } from "@/components/prices/product-type-filter";
import { useCurrentPrices } from "@/lib/queries/use-current-prices";
import type { Province, Retailer, ProductType } from "@/lib/constants";

export function DashboardClient() {
  const [province, setProvince] = useState<Province | undefined>();
  const [retailer, setRetailer] = useState<Retailer | undefined>();
  const [productType, setProductType] = useState<ProductType | undefined>();

  const { data, isLoading } = useCurrentPrices({
    province,
    retailer,
    productType,
  });

  return (
    <>
      <div className="mb-6">
        <WorldGoldPrice />
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <ProvinceFilter value={province} onValueChange={setProvince} />
        <RetailerFilter value={retailer} onValueChange={setRetailer} />
        <ProductTypeFilter value={productType} onValueChange={setProductType} />
      </div>

      <PriceTable data={data?.data || []} isLoading={isLoading} />

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Hiển thị giá cuối cùng cho mỗi nhà bán, loại sản phẩm và tỉnh/thành
          phố
        </p>
      </div>
    </>
  );
}
