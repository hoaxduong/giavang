'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrencyUSD, formatRelativeTime } from '@/lib/utils'
import { useWorldGoldPrice } from '@/lib/queries/use-world-gold-price'

export function WorldGoldPrice() {
  const { data, isLoading } = useWorldGoldPrice()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  const worldGold = data?.data

  if (!worldGold) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giá Vàng Thế Giới (XAU/USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Không có dữ liệu giá vàng thế giới
          </p>
        </CardContent>
      </Card>
    )
  }

  const buyPrice = Number(worldGold.buy_price)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Giá Vàng Thế Giới (XAU/USD)</CardTitle>
          <Badge variant="outline" className="text-xs">
            {formatRelativeTime(worldGold.created_at)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Giá Hiện Tại</p>
            <p className="text-3xl font-bold font-mono">
              {formatCurrencyUSD(buyPrice)}
            </p>
          </div>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Đơn vị: {worldGold.unit}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

