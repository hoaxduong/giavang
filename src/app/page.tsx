'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PriceTable } from '@/components/prices/price-table'
import { ProvinceFilter } from '@/components/prices/province-filter'
import { RetailerFilter } from '@/components/prices/retailer-filter'
import { ProductTypeFilter } from '@/components/prices/product-type-filter'
import { RefreshIndicator } from '@/components/shared/refresh-indicator'
import { useCurrentPrices } from '@/lib/queries/use-current-prices'
import type { Province, Retailer, ProductType } from '@/lib/constants'

export default function Home() {
  const [province, setProvince] = useState<Province | undefined>()
  const [retailer, setRetailer] = useState<Retailer | undefined>()
  const [productType, setProductType] = useState<ProductType | undefined>()

  const { data, isLoading } = useCurrentPrices({
    province,
    retailer,
    productType,
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Giá Vàng Hôm Nay
              </h1>
              <p className="text-muted-foreground mt-2">
                Cập nhật giá vàng mới nhất từ các nhà bán lẻ lớn
              </p>
            </div>
            <RefreshIndicator />
          </div>

          <div className="flex flex-wrap gap-4">
            <ProvinceFilter value={province} onValueChange={setProvince} />
            <RetailerFilter value={retailer} onValueChange={setRetailer} />
            <ProductTypeFilter value={productType} onValueChange={setProductType} />
          </div>
        </div>

        <PriceTable data={data?.data || []} isLoading={isLoading} />

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Dữ liệu được cập nhật tự động mỗi 5 phút</p>
        </div>
      </main>
    </div>
  )
}
