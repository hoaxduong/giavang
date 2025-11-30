'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatCurrencyCompact, formatCurrency } from '@/lib/utils'
import { usePortfolioGrowth } from '@/lib/queries/use-portfolio-growth'

export function PortfolioGrowthChart() {
  const [groupBy, setGroupBy] = useState<'total' | 'monthly' | 'yearly'>('total')
  const { data, isLoading } = usePortfolioGrowth(groupBy)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biểu Đồ Tăng Trưởng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biểu Đồ Tăng Trưởng</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Chưa có dữ liệu để hiển thị biểu đồ
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (groupBy === 'yearly') {
        return format(date, 'yyyy', { locale: vi })
      } else if (groupBy === 'monthly') {
        return format(date, 'MM/yyyy', { locale: vi })
      } else {
        return format(date, 'dd/MM/yyyy', { locale: vi })
      }
    } catch {
      return dateString
    }
  }

  const formatPrice = (price: number) => {
    return formatCurrencyCompact(price)
  }

  const chartData = data.data.map((point) => ({
    date: point.date,
    'Giá Trị': point.value,
    'Đã Đầu Tư': point.invested,
    'Lãi/Lỗ': point.profitLoss,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Biểu Đồ Tăng Trưởng</CardTitle>
          <Select value={groupBy} onValueChange={(value: 'total' | 'monthly' | 'yearly') => setGroupBy(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Tổng</SelectItem>
              <SelectItem value="monthly">Theo Tháng</SelectItem>
              <SelectItem value="yearly">Theo Năm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              className="text-xs"
              stroke="currentColor"
            />
            <YAxis
              tickFormatter={formatPrice}
              className="text-xs"
              stroke="currentColor"
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => {
                try {
                  return format(new Date(label), 'PPP', { locale: vi })
                } catch {
                  return label
                }
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Giá Trị"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Đã Đầu Tư"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Lãi/Lỗ"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

