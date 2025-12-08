"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyUSD, formatRelativeTime } from "@/lib/utils";
import { useWorldGoldPrice } from "@/lib/queries/use-world-gold-price";
import { useHistoricalPrices } from "@/lib/queries/use-historical-prices";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { subDays, format } from "date-fns";
import { vi } from "date-fns/locale";

export function WorldGoldPrice() {
  const { data, isLoading } = useWorldGoldPrice();

  // Fetch historical data for the last 30 days for the chart
  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => subDays(endDate, 30), [endDate]);

  const { data: historyData } = useHistoricalPrices({
    startDate,
    endDate,
    unit: "USD/oz",
    interval: "daily",
  });

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
    );
  }

  const worldGold = data?.data;

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
    );
  }

  const buyPrice = Number(worldGold.buy_price);
  const buyChange = worldGold.buyChange ?? 0;
  const buyChangePercent = worldGold.buyChangePercent ?? 0;

  // Determine color based on change
  const changeColor =
    buyChange > 0
      ? "text-green-600 dark:text-green-500"
      : buyChange < 0
        ? "text-red-600 dark:text-red-500"
        : "text-muted-foreground";

  // Prepare chart data
  const chartData =
    historyData?.data?.map((item) => ({
      date: item.created_at,
      value: Number(item.buy_price),
    })) || [];

  const isPositiveTrend =
    chartData.length > 1 &&
    chartData[chartData.length - 1].value >= chartData[0].value;

  const chartColor = isPositiveTrend ? "#22c55e" : "#ef4444"; // green-500 or red-500

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Giá Vàng Thế Giới (XAU/USD)</CardTitle>
          <Badge variant="outline" className="text-xs">
            {formatRelativeTime(worldGold.created_at)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Price Info */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Giá Hiện Tại</p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold font-mono tracking-tight">
                  {formatCurrencyUSD(buyPrice)}
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 mt-1 text-base font-medium",
                  changeColor
                )}
              >
                <div
                  className={cn(
                    "flex items-center px-1.5 py-0.5 rounded",
                    buyChange > 0
                      ? "bg-green-100 dark:bg-green-900/30"
                      : buyChange < 0
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-gray-100 dark:bg-gray-800"
                  )}
                >
                  {buyChange > 0 ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : buyChange < 0 ? (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  ) : null}
                  <span>
                    {buyChange > 0 ? "+" : ""}
                    {formatCurrencyUSD(buyChange)}
                  </span>
                </div>
                <span>
                  ({buyChangePercent > 0 ? "+" : ""}
                  {buyChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground pt-2">
              Đơn vị: {worldGold.unit}
            </div>
          </div>

          {/* Mini Chart */}
          {historyData?.data && historyData.data.length > 1 && (
            <div className="flex-1 min-h-[120px] sm:max-w-[50%] relative">
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={chartColor}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartColor}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide={true} />
                    <YAxis hide={true} domain={["auto", "auto"]} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length && label) {
                          return (
                            <div className="bg-popover border border-border rounded-lg shadow-sm p-2 text-xs">
                              <p className="text-muted-foreground mb-1">
                                {format(new Date(label), "dd/MM/yyyy", {
                                  locale: vi,
                                })}
                              </p>
                              <p className="font-bold font-mono">
                                {formatCurrencyUSD(Number(payload[0].value))}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute top-0 right-0 text-xs text-muted-foreground pointer-events-none bg-background/50 backdrop-blur-sm px-1 rounded">
                30 ngày qua
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
