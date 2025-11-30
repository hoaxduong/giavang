'use client'

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
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatCurrencyCompact } from '@/lib/utils'
import type { PriceSnapshot } from '@/lib/types'

interface PriceLineChartProps {
  data: PriceSnapshot[]
  title?: string
}

export function PriceLineChart({ data, title = 'Biểu Đồ Giá Vàng' }: PriceLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Không có dữ liệu biểu đồ
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM', { locale: vi })
    } catch {
      return dateString
    }
  }

  const formatPrice = (price: number) => {
    return formatCurrencyCompact(price)
  }

  const chartData = data.map((item) => ({
    date: item.created_at,
    'Giá Mua': Number(item.buy_price),
    'Giá Bán': Number(item.sell_price),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
              formatter={(value: number) => formatPrice(value)}
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
              dataKey="Giá Mua"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Giá Bán"
              stroke="hsl(var(--chart-2))"
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
