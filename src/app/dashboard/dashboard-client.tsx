'use client'

import { useState } from 'react'
import { PriceTable } from '@/components/prices/price-table'
import { ProvinceFilter } from '@/components/prices/province-filter'
import { RetailerFilter } from '@/components/prices/retailer-filter'
import { ProductTypeFilter } from '@/components/prices/product-type-filter'
import { useCurrentPrices } from '@/lib/queries/use-current-prices'
import type { Province, Retailer, ProductType } from '@/lib/constants'

export function DashboardClient() {
  const [province, setProvince] = useState<Province | undefined>()
  const [retailer, setRetailer] = useState<Retailer | undefined>()
  const [productType, setProductType] = useState<ProductType | undefined>()

  const { data, isLoading } = useCurrentPrices({
    province,
    retailer,
    productType,
  })

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4">
        <ProvinceFilter value={province} onValueChange={setProvince} />
        <RetailerFilter value={retailer} onValueChange={setRetailer} />
        <ProductTypeFilter value={productType} onValueChange={setProductType} />
      </div>

      <PriceTable data={data?.data || []} isLoading={isLoading} />

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Dữ liệu được cập nhật tự động mỗi 5 phút</p>
      </div>
    </>
  )
}

