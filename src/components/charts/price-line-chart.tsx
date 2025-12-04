"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatCurrencyCompact } from "@/lib/utils";
import type { PriceSnapshot } from "@/lib/types";

interface PriceLineChartProps {
  data: PriceSnapshot[];
  title?: string;
}

export function PriceLineChart({
  data,
  title = "Biểu Đồ Giá Vàng",
}: PriceLineChartProps) {
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
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM", { locale: vi });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    return formatCurrencyCompact(price);
  };

  const chartData = data.map((item) => ({
    date: item.created_at,
    "Giá Mua": Number(item.buy_price),
    "Giá Bán": Number(item.sell_price),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeWidth={1}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              stroke="hsl(var(--border))"
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value: number) => formatPrice(value)}
              labelFormatter={(label) => {
                try {
                  return format(new Date(label), "PPP", { locale: vi });
                } catch {
                  return label;
                }
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Legend
              wrapperStyle={{
                color: "hsl(var(--foreground))",
              }}
            />
            <Line
              type="monotone"
              dataKey="Giá Mua"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#22c55e" }}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="Giá Bán"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#ef4444" }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
