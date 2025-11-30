'use client'

import { useState } from 'react'
import { subDays, subMonths, subYears } from 'date-fns'
import { Header } from '@/components/layout/header'
import { PriceLineChart } from '@/components/charts/price-line-chart'
import { ChartTimeFilter } from '@/components/charts/chart-time-filter'
import { ProductTypeFilter } from '@/components/prices/product-type-filter'
import { RetailerFilter } from '@/components/prices/retailer-filter'
import { ProvinceFilter } from '@/components/prices/province-filter'
import { useHistoricalPrices } from '@/lib/queries/use-historical-prices'
import type { TimeRange, ProductType, Retailer, Province } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ChartsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [productType, setProductType] = useState<ProductType>('SJC_BARS')
  const [retailer, setRetailer] = useState<Retailer | undefined>()
  const [province, setProvince] = useState<Province | undefined>()

  const getDateRange = () => {
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
  }

  const { startDate, endDate } = getDateRange()

  const { data, isLoading, error } = useHistoricalPrices({
    productType,
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
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Biểu Đồ Giá Vàng
            </h1>
            <p className="text-muted-foreground mt-2">
              Xem xu hướng biến động giá vàng theo thời gian
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <ChartTimeFilter value={timeRange} onChange={setTimeRange} />
            <ProductTypeFilter value={productType} onValueChange={(val) => setProductType(val || 'SJC_BARS')} />
            <RetailerFilter value={retailer} onValueChange={setRetailer} />
            <ProvinceFilter value={province} onValueChange={setProvince} />
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Lỗi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">
                Không thể tải dữ liệu biểu đồ. Vui lòng thử lại sau.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PriceLineChart data={data?.data || []} />
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Hiển thị dữ liệu từ{' '}
            {startDate.toLocaleDateString('vi-VN')} đến{' '}
            {endDate.toLocaleDateString('vi-VN')}
          </p>
        </div>
      </main>
    </div>
  )
}
