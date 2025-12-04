'use client'

import { useState, useMemo } from 'react'
import { subDays, subMonths, subYears } from 'date-fns'
import { Header } from '@/components/layout/header'
import { PriceTable } from '@/components/prices/price-table'
import { WorldGoldPrice } from '@/components/prices/world-gold-price'
import { ProvinceFilter } from '@/components/prices/province-filter'
import { RetailerFilter } from '@/components/prices/retailer-filter'
import { ProductTypeFilter } from '@/components/prices/product-type-filter'
import { RefreshIndicator } from '@/components/shared/refresh-indicator'
import { PriceLineChart } from '@/components/charts/price-line-chart'
import { ChartTimeFilter } from '@/components/charts/chart-time-filter'
import { useCurrentPrices } from '@/lib/queries/use-current-prices'
import { useHistoricalPrices } from '@/lib/queries/use-historical-prices'
import type { Province, Retailer, ProductType, TimeRange } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Home() {
  const [province, setProvince] = useState<Province | undefined>()
  const [retailer, setRetailer] = useState<Retailer | undefined>()
  const [productType, setProductType] = useState<ProductType | undefined>()
  const [timeRange, setTimeRange] = useState<TimeRange>('month')

  const { data, isLoading } = useCurrentPrices({
    province,
    retailer,
    productType,
  })

  const { startDate, endDate } = useMemo(() => {
    const endDate = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'day':
        startDate = subDays(endDate, 1)
        break
      case 'week':
        startDate = subDays(endDate, 7)
        break
      case 'month':
        startDate = subMonths(endDate, 1)
        break
      case 'quarter':
        startDate = subMonths(endDate, 3)
        break
      case 'year':
        startDate = subYears(endDate, 1)
        break
      default:
        startDate = subMonths(endDate, 1)
    }

    return { startDate, endDate }
  }, [timeRange])

  const { data: chartData, isLoading: chartLoading, error: chartError } = useHistoricalPrices({
    productType: productType || 'SJC_BARS',
    retailer,
    province,
    startDate,
    endDate,
    interval: timeRange === 'day' ? 'hourly' : 'daily',
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

        <div className="mb-6">
          <WorldGoldPrice />
        </div>

        <PriceTable data={data?.data || []} isLoading={isLoading} />

        <div className="mt-8 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Biểu Đồ Giá Vàng
            </h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <ChartTimeFilter value={timeRange} onChange={setTimeRange} />
            <ProductTypeFilter value={productType} onValueChange={setProductType} />
            <RetailerFilter value={retailer} onValueChange={setRetailer} />
            <ProvinceFilter value={province} onValueChange={setProvince} />
          </div>

          {chartLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : chartError ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Không thể tải dữ liệu biểu đồ
                </p>
              </CardContent>
            </Card>
          ) : chartData?.data && chartData.data.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Không có dữ liệu biểu đồ trong khoảng thời gian này
                </p>
              </CardContent>
            </Card>
          ) : (
            <PriceLineChart data={chartData?.data || []} />
          )}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Dữ liệu được cập nhật tự động mỗi 5 phút</p>
        </div>
      </main>
    </div>
  )
}
