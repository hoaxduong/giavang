"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatCurrency,
  formatVietnameseDate,
  calculatePercentChange,
  formatRetailerName,
} from "@/lib/utils";
import {
  usePortfolio,
  useUpdatePortfolioEntry,
  useDeletePortfolioEntry,
} from "@/lib/queries/use-portfolio";
import { useCurrentPrices } from "@/lib/queries/use-current-prices";
import type { PortfolioEntry } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PortfolioTableProps {
  onEdit?: (entry: PortfolioEntry) => void;
}

export function PortfolioTable({ onEdit }: PortfolioTableProps) {
  const { data: entries, isLoading } = usePortfolio();
  const { data: currentPrices } = useCurrentPrices();
  const updateMutation = useUpdatePortfolioEntry();
  const deleteMutation = useDeletePortfolioEntry();

  const [sellingEntryId, setSellingEntryId] = useState<string | null>(null);
  const [soldAt, setSoldAt] = useState(() => {
    const now = new Date();
    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return localDateTime.toISOString().slice(0, 16);
  });

  // Create a map of current prices for quick lookup
  // Use buy_price (retailer's buy price) - this is what user would receive if selling now
  const currentPriceMap = new Map<string, number>();
  if (currentPrices?.data) {
    currentPrices.data.forEach((price) => {
      const key = `${price.retailer}-${price.province}-${price.product_name}`;
      currentPriceMap.set(key, Number(price.buy_price));
    });
  }

  const handleMarkAsSold = async (entry: PortfolioEntry) => {
    if (!soldAt) return;

    try {
      const soldAtDate = new Date(soldAt);
      const soldAtISO = soldAtDate.toISOString();

      await updateMutation.mutateAsync({
        id: entry.id,
        sold_at: soldAtISO,
      });

      setSellingEntryId(null);
      setSoldAt(() => {
        const now = new Date();
        const localDateTime = new Date(
          now.getTime() - now.getTimezoneOffset() * 60000
        );
        return localDateTime.toISOString().slice(0, 16);
      });
    } catch (error) {
      console.error("Failed to mark as sold:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const calculateEntryValue = (entry: PortfolioEntry) => {
    if (entry.sold_at && entry.sell_price) {
      // Already sold - use sell price
      return Number(entry.amount) * Number(entry.sell_price);
    }

    // Not sold - use current price
    const key = `${entry.retailer}-${entry.province || ""}-${entry.productName}`;
    const currentPrice = currentPriceMap.get(key);

    if (currentPrice) {
      return Number(entry.amount) * currentPrice;
    }

    // Fallback: use buy price if current price not available
    return Number(entry.amount) * Number(entry.buy_price);
  };

  const calculateProfitLoss = (entry: PortfolioEntry) => {
    const invested = Number(entry.amount) * Number(entry.buy_price);
    const currentValue = calculateEntryValue(entry);
    return currentValue - invested;
  };

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

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Giao Dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên của bạn!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh Sách Giao Dịch ({entries.length} mục)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-3 px-4 text-left font-semibold">Nhà Bán</th>
                <th className="pb-3 px-4 text-left font-semibold">Sản Phẩm</th>
                <th className="pb-3 px-4 text-left font-semibold">Số Lượng</th>
                <th className="pb-3 px-4 text-right font-semibold">Giá Mua</th>
                <th className="pb-3 px-4 text-right font-semibold">Giá Bán</th>
                <th className="pb-3 px-4 text-right font-semibold">
                  Giá Trị Hiện Tại
                </th>
                <th className="pb-3 px-4 text-right font-semibold">Lãi/Lỗ</th>
                <th className="pb-3 px-4 text-left font-semibold">
                  Thời Gian Mua
                </th>
                <th className="pb-3 px-4 text-left font-semibold">
                  Thời Gian Bán
                </th>
                <th className="pb-3 px-4 text-center font-semibold">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const profitLoss = calculateProfitLoss(entry);
                const profitLossPercent = calculatePercentChange(
                  Number(entry.amount) * Number(entry.buy_price),
                  calculateEntryValue(entry)
                );
                const isSold = !!entry.sold_at;

                return (
                  <tr
                    key={entry.id}
                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">
                      {formatRetailerName(entry.retailer)}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="text-xs">
                        {entry.productName}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm">{entry.amount} chỉ</td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      {formatCurrency(Number(entry.buy_price))}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      {entry.sell_price
                        ? formatCurrency(Number(entry.sell_price))
                        : "-"}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">
                      {formatCurrency(calculateEntryValue(entry))}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={
                            profitLoss > 0
                              ? "success"
                              : profitLoss < 0
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {formatCurrency(profitLoss)}
                        </Badge>
                        <span
                          className={`text-xs ${
                            profitLoss > 0
                              ? "text-green-600"
                              : profitLoss < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {profitLossPercent > 0 ? "+" : ""}
                          {profitLossPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {formatVietnameseDate(
                        entry.bought_at,
                        "dd/MM/yyyy HH:mm"
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {entry.sold_at
                        ? formatVietnameseDate(
                            entry.sold_at,
                            "dd/MM/yyyy HH:mm"
                          )
                        : "-"}
                    </td>
                    <td className="py-4 px-4">
                      {sellingEntryId === entry.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <Label
                            htmlFor={`soldAt-${entry.id}`}
                            className="text-xs"
                          >
                            Thời gian bán
                          </Label>
                          <Input
                            id={`soldAt-${entry.id}`}
                            type="datetime-local"
                            value={soldAt}
                            onChange={(e) => setSoldAt(e.target.value)}
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleMarkAsSold(entry)}
                              disabled={updateMutation.isPending}
                              className="text-xs"
                            >
                              Xác nhận
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSellingEntryId(null)}
                              className="text-xs"
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              ⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isSold && (
                              <DropdownMenuItem
                                onClick={() => setSellingEntryId(entry.id)}
                              >
                                Đánh dấu đã bán
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onEdit?.(entry)}>
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(entry.id)}
                              className="text-destructive"
                            >
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
