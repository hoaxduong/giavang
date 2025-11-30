'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, calculatePercentChange } from '@/lib/utils'
import { usePortfolioStats } from '@/lib/queries/use-portfolio-stats'

export function PortfolioStats() {
  const { data: stats, isLoading } = usePortfolioStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Không thể tải thống kê danh mục
          </p>
        </CardContent>
      </Card>
    )
  }

  const profitLossColor =
    stats.profitLossVnd > 0
      ? 'text-green-600'
      : stats.profitLossVnd < 0
      ? 'text-red-600'
      : 'text-muted-foreground'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tổng Kỳ Mua</CardTitle>
          <CardDescription>Số lượng giao dịch mua</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPurchasePeriod}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tổng Lượng Vàng</CardTitle>
          <CardDescription>Tổng số lượng vàng đã mua</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalGoldAmount.toFixed(3)} chỉ</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tổng VND Đã Đầu Tư</CardTitle>
          <CardDescription>Tổng số tiền đã đầu tư</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(stats.totalVndInvested)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Giá Trị Hiện Tại</CardTitle>
          <CardDescription>Giá trị hiện tại của danh mục</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(stats.currentVndValue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Lãi/Lỗ (VND)</CardTitle>
          <CardDescription>Lợi nhuận hoặc thua lỗ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold font-mono ${profitLossColor}`}>
            {stats.profitLossVnd > 0 ? '+' : ''}
            {formatCurrency(stats.profitLossVnd)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Lãi/Lỗ (%)</CardTitle>
          <CardDescription>Tỷ lệ lợi nhuận hoặc thua lỗ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${profitLossColor}`}>
              {stats.profitLossPercent > 0 ? '+' : ''}
              {stats.profitLossPercent.toFixed(2)}%
            </div>
            <Badge
              variant={
                stats.profitLossPercent > 0
                  ? 'success'
                  : stats.profitLossPercent < 0
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {stats.profitLossPercent > 0 ? 'Lãi' : stats.profitLossPercent < 0 ? 'Lỗ' : 'Hòa'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Giao Dịch Đã Bán</CardTitle>
          <CardDescription>Số giao dịch đã bán</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.soldEntries}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Giao Dịch Đang Nắm Giữ</CardTitle>
          <CardDescription>Số giao dịch chưa bán</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeEntries}</div>
        </CardContent>
      </Card>
    </div>
  )
}

