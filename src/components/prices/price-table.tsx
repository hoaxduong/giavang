"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

import type { EnrichedPriceSnapshot } from "@/lib/types";

import { DatePicker } from "@/components/ui/date-picker";

interface PriceTableProps {
  data: EnrichedPriceSnapshot[];
  isLoading: boolean;
  date?: Date;
  onDateChange?: (date?: Date) => void;
}

export function PriceTable({
  data,
  isLoading,
  date,
  onDateChange,
}: PriceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle empty data but allow changing date back
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Giá Vàng</CardTitle>
          {onDateChange && <DatePicker date={date} setDate={onDateChange} />}
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Không có dữ liệu giá vàng
            {date && " cho ngày này"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">Giá Vàng Hiện Tại</CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.length} địa điểm/sản phẩm được cập nhật
          </p>
        </div>
        {onDateChange && <DatePicker date={date} setDate={onDateChange} />}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-3 px-4 text-left font-semibold">Nhà Bán</th>
                <th className="pb-3 px-4 text-left font-semibold">Sản Phẩm</th>
                <th className="pb-3 px-4 text-left font-semibold">Tỉnh/TP</th>

                <th className="pb-3 px-4 text-right font-semibold">Giá Mua</th>
                <th className="pb-3 px-4 text-right font-semibold">Giá Bán</th>
                <th className="pb-3 px-4 text-right font-semibold">
                  Chênh Lệch
                </th>
                <th className="pb-3 px-4 text-left font-semibold">Cập Nhật</th>
              </tr>
            </thead>
            <tbody>
              {data.map((price, index) => {
                const spread =
                  Number(price.sell_price) - Number(price.buy_price);
                return (
                  <tr
                    key={`${price.retailer}-${price.province}-${index}`}
                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">{price.retailer}</td>
                    <td className="py-4 px-4 text-sm font-medium">
                      {price.product_name || "Vàng SJC"}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {price.province || "Toàn quốc"}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center justify-end gap-1">
                          {formatCurrency(Number(price.buy_price))}
                        </div>
                        <div
                          className={`text-xs flex items-center gap-1 ${
                            (price.buyChange || 0) > 0
                              ? "text-green-600"
                              : (price.buyChange || 0) < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span>
                            {(price.buyChange || 0) > 0 ? "+" : ""}
                            {formatCurrency(price.buyChange || 0)}
                          </span>
                          <span className="opacity-80">
                            ({(price.buyChangePercent || 0).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center justify-end gap-1">
                          {formatCurrency(Number(price.sell_price))}
                        </div>
                        <div
                          className={`text-xs flex items-center gap-1 ${
                            (price.sellChange || 0) > 0
                              ? "text-green-600"
                              : (price.sellChange || 0) < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span>
                            {(price.sellChange || 0) > 0 ? "+" : ""}
                            {formatCurrency(price.sellChange || 0)}
                          </span>
                          <span className="opacity-80">
                            ({(price.sellChangePercent || 0).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Badge
                        variant={spread > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {formatCurrency(spread)}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {formatRelativeTime(price.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
