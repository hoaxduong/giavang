"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, calculatePercentChange, cn } from "@/lib/utils";
import {
  RETAILERS,
  PROVINCES,
  type Retailer,
  type Province,
} from "@/lib/constants";
import { useCurrentPrices } from "@/lib/queries/use-current-prices";

/**
 * Transaction row interface
 */
interface TransactionRow {
  id: string;
  goldAmount: number;
  buyPrice: number;
  retailer: Retailer | "";
  productName: string;
  province: Province | "";
}

export function GoldCostCalculator() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const { data: currentPrices, isLoading: pricesLoading } = useCurrentPrices();

  // Create a map of current prices for quick lookup
  // Use buy_price (retailer's buy price) - this is what user would receive when selling
  const currentPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (currentPrices?.data) {
      currentPrices.data.forEach((price) => {
        const key = `${price.retailer}-${price.province || ""}-${price.product_name}`;
        map.set(key, Number(price.buy_price));
      });
    }
    return map;
  }, [currentPrices]);

  const availableProducts = useMemo(() => {
    if (!currentPrices?.data) return [];
    const names = new Set(
      currentPrices.data.map((p) => p.product_name).filter(Boolean)
    );
    return Array.from(names).sort() as string[];
  }, [currentPrices]);

  /**
   * Add new transaction row
   */
  const addTransaction = () => {
    const newTransaction: TransactionRow = {
      id: crypto.randomUUID(),
      goldAmount: 0,
      buyPrice: 0,
      retailer: "",
      productName: "",
      province: "",
    };
    setTransactions([...transactions, newTransaction]);
  };

  /**
   * Remove transaction row by ID
   */
  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter((tx) => tx.id !== id));
  };

  /**
   * Update transaction field
   */
  const updateTransaction = (
    id: string,
    field: keyof TransactionRow,
    value: any
  ) => {
    setTransactions(
      transactions.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx))
    );
  };

  /**
   * Get current sell price for a transaction
   */
  const getCurrentPrice = (
    retailer: Retailer | "",
    province: Province | "",
    productName: string
  ): number => {
    if (!retailer || !productName) return 0;
    const key = `${retailer}-${province || ""}-${productName}`;
    return currentPriceMap.get(key) || 0;
  };

  /**
   * Calculate current value of a transaction
   */
  const calculateCurrentValue = (tx: TransactionRow): number => {
    const currentPrice = getCurrentPrice(
      tx.retailer,
      tx.province,
      tx.productName
    );
    return (tx.goldAmount || 0) * currentPrice;
  };

  /**
   * Calculate profit/loss for a transaction
   */
  const calculateTransactionProfitLoss = (tx: TransactionRow): number => {
    const invested = (tx.goldAmount || 0) * (tx.buyPrice || 0);
    const currentValue = calculateCurrentValue(tx);
    return currentValue - invested;
  };

  /**
   * Calculate all metrics using useMemo for performance
   */
  const calculationResults = useMemo(() => {
    const totalGold = transactions.reduce(
      (sum, tx) => sum + (tx.goldAmount || 0),
      0
    );
    const totalInvested = transactions.reduce(
      (sum, tx) => sum + (tx.goldAmount || 0) * (tx.buyPrice || 0),
      0
    );
    const averageCost = totalGold > 0 ? totalInvested / totalGold : 0;
    const estimatedRevenue = transactions.reduce(
      (sum, tx) => sum + calculateCurrentValue(tx),
      0
    );
    const profitLoss = estimatedRevenue - totalInvested;
    const profitLossPercent = calculatePercentChange(
      totalInvested,
      estimatedRevenue
    );

    return {
      totalGold,
      totalInvested,
      averageCost,
      estimatedRevenue,
      profitLoss,
      profitLossPercent,
    };
  }, [transactions, currentPriceMap]);

  /**
   * Calculate individual transaction total
   */
  const calculateTransactionTotal = (goldAmount: number, buyPrice: number) => {
    return (goldAmount || 0) * (buyPrice || 0);
  };

  return (
    <div className="space-y-6">
      {/* Transaction Input Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nhập Giao Dịch Mua Vàng</CardTitle>
            <Button onClick={addTransaction}>+ Thêm Giao Dịch</Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên của bạn!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 px-2 text-left font-semibold text-xs">
                      Số Lượng
                    </th>
                    <th className="pb-2 px-2 text-left font-semibold text-xs">
                      Giá Mua
                    </th>
                    <th className="pb-2 px-2 text-left font-semibold text-xs">
                      Nhà Bán
                    </th>
                    <th className="pb-2 px-2 text-left font-semibold text-xs">
                      Tỉnh/TP
                    </th>
                    <th className="pb-2 px-2 text-left font-semibold text-xs">
                      Sản Phẩm
                    </th>
                    <th className="pb-2 px-2 text-right font-semibold text-xs">
                      Vốn
                    </th>
                    <th className="pb-2 px-2 text-right font-semibold text-xs">
                      Giá HT
                    </th>
                    <th className="pb-2 px-2 text-right font-semibold text-xs">
                      GT HT
                    </th>
                    <th className="pb-2 px-2 text-right font-semibold text-xs">
                      Lãi/Lỗ
                    </th>
                    <th className="pb-2 px-2 text-center font-semibold text-xs">
                      Xóa
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const currentPrice = getCurrentPrice(
                      tx.retailer,
                      tx.province,
                      tx.productName
                    );
                    const invested = calculateTransactionTotal(
                      tx.goldAmount,
                      tx.buyPrice
                    );
                    const currentValue = calculateCurrentValue(tx);
                    const profitLoss = calculateTransactionProfitLoss(tx);
                    const profitLossPercent =
                      invested > 0
                        ? calculatePercentChange(invested, currentValue)
                        : 0;

                    return (
                      <tr
                        key={tx.id}
                        className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={tx.goldAmount || ""}
                            onChange={(e) =>
                              updateTransaction(
                                tx.id,
                                "goldAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 text-sm"
                            placeholder="0.0"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={tx.buyPrice || ""}
                            onChange={(e) =>
                              updateTransaction(
                                tx.id,
                                "buyPrice",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-32 text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={tx.retailer}
                            onValueChange={(value) =>
                              updateTransaction(
                                tx.id,
                                "retailer",
                                value as Retailer
                              )
                            }
                          >
                            <SelectTrigger className="w-36 text-sm">
                              <SelectValue placeholder="Chọn" />
                            </SelectTrigger>
                            <SelectContent>
                              {RETAILERS.map((retailer) => (
                                <SelectItem key={retailer} value={retailer}>
                                  {retailer}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={tx.province}
                            onValueChange={(value) =>
                              updateTransaction(
                                tx.id,
                                "province",
                                value as Province
                              )
                            }
                          >
                            <SelectTrigger className="w-32 text-sm">
                              <SelectValue placeholder="Chọn" />
                            </SelectTrigger>
                            <SelectContent>
                              {PROVINCES.map((province) => (
                                <SelectItem key={province} value={province}>
                                  {province}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={tx.productName}
                            onValueChange={(value) =>
                              updateTransaction(tx.id, "productName", value)
                            }
                          >
                            <SelectTrigger className="w-32 text-sm">
                              <SelectValue placeholder="Chọn" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProducts.map((prod) => (
                                <SelectItem key={prod} value={prod}>
                                  {prod}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-xs">
                          {formatCurrency(invested)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-xs">
                          {pricesLoading ? (
                            <Skeleton className="h-4 w-20 ml-auto" />
                          ) : (
                            formatCurrency(currentPrice)
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-xs">
                          {pricesLoading ? (
                            <Skeleton className="h-4 w-20 ml-auto" />
                          ) : (
                            formatCurrency(currentValue)
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {pricesLoading ? (
                            <Skeleton className="h-6 w-20 ml-auto" />
                          ) : (
                            <div className="flex flex-col items-end gap-0.5">
                              <Badge
                                variant={
                                  profitLoss > 0
                                    ? "success"
                                    : profitLoss < 0
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs px-1.5 py-0.5"
                              >
                                {formatCurrency(profitLoss)}
                              </Badge>
                              <span
                                className={cn(
                                  "text-xs",
                                  profitLoss > 0
                                    ? "text-green-600"
                                    : profitLoss < 0
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                )}
                              >
                                {profitLossPercent > 0 ? "+" : ""}
                                {profitLossPercent.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTransaction(tx.id)}
                            className="text-destructive hover:text-destructive h-8 px-2 text-xs"
                          >
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gold Amount */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Số Lượng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculationResults.totalGold.toFixed(3)} chỉ
            </div>
          </CardContent>
        </Card>

        {/* Total Investment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Vốn Đầu Tư
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculationResults.totalInvested)}
            </div>
          </CardContent>
        </Card>

        {/* Average Cost */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Giá Vốn Trung Bình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculationResults.averageCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">VND/chỉ</p>
          </CardContent>
        </Card>

        {/* Profit/Loss */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lãi/Lỗ Hiện Tại
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pricesLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <Badge
                  variant={
                    calculationResults.profitLoss > 0
                      ? "success"
                      : calculationResults.profitLoss < 0
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-lg font-bold px-3 py-1"
                >
                  {formatCurrency(calculationResults.profitLoss)}
                </Badge>
                <p
                  className={cn(
                    "text-sm mt-2",
                    calculationResults.profitLoss > 0
                      ? "text-green-600"
                      : calculationResults.profitLoss < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                  )}
                >
                  {calculationResults.profitLossPercent > 0 ? "+" : ""}
                  {calculationResults.profitLossPercent.toFixed(2)}%
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Calculation Breakdown */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chi Tiết Tính Toán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Tổng số lượng vàng:
                </span>
                <span className="font-semibold">
                  {calculationResults.totalGold.toFixed(3)} chỉ
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Tổng vốn đầu tư:</span>
                <span className="font-semibold">
                  {formatCurrency(calculationResults.totalInvested)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Giá vốn trung bình:
                </span>
                <span className="font-semibold">
                  {formatCurrency(calculationResults.averageCost)} / chỉ
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Giá trị hiện tại (theo giá thị trường):
                </span>
                <span className="font-semibold">
                  {pricesLoading ? (
                    <Skeleton className="h-4 w-32 inline-block" />
                  ) : (
                    formatCurrency(calculationResults.estimatedRevenue)
                  )}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-muted/50 px-3 rounded-md mt-2">
                <span className="font-semibold">Lãi/Lỗ:</span>
                {pricesLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <span
                    className={cn(
                      "font-bold",
                      calculationResults.profitLoss > 0
                        ? "text-green-600"
                        : calculationResults.profitLoss < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    )}
                  >
                    {formatCurrency(calculationResults.profitLoss)} (
                    {calculationResults.profitLossPercent > 0 ? "+" : ""}
                    {calculationResults.profitLossPercent.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
