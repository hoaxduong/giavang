"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { PRODUCT_TYPES } from "@/lib/constants";
import type { PriceSnapshot } from "@/lib/types";

/**
 * Get user-friendly label for product type
 */
function getProductTypeLabel(productType: string): string {
  const product = PRODUCT_TYPES.find((p) => p.value === productType);
  return product?.label || productType;
}

interface PriceTableProps {
  data: PriceSnapshot[];
  isLoading: boolean;
}

export function PriceTable({ data, isLoading }: PriceTableProps) {
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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giá Vàng Hiện Tại</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Không có dữ liệu giá vàng
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giá Vàng Hiện Tại ({data.length} mục)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-3 px-4 text-left font-semibold">Nhà Bán</th>
                <th className="pb-3 px-4 text-left font-semibold">Tỉnh/TP</th>
                <th className="pb-3 px-4 text-left font-semibold">Loại Vàng</th>
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
                    key={`${price.retailer}-${price.province}-${price.product_type}-${index}`}
                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">{price.retailer}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {price.province}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="text-xs">
                        {getProductTypeLabel(price.product_type)}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrency(Number(price.buy_price))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrency(Number(price.sell_price))}
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
