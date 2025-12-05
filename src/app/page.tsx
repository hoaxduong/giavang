"use client";

import { useState, useMemo } from "react";
import { subDays, subMonths, subYears } from "date-fns";
import { Header } from "@/components/layout/header";
import { PriceTable } from "@/components/prices/price-table";
import { WorldGoldPrice } from "@/components/prices/world-gold-price";
import { ProvinceFilter } from "@/components/prices/province-filter";
import { RetailerFilter } from "@/components/prices/retailer-filter";

import { RefreshIndicator } from "@/components/shared/refresh-indicator";
import { PriceLineChart } from "@/components/charts/price-line-chart";
import { ChartTimeFilter } from "@/components/charts/chart-time-filter";
import { RetailerProductFilter } from "@/components/prices/retailer-product-filter";
import { useRetailerProducts } from "@/lib/queries/use-retailer-products";
import { useCurrentPrices } from "@/lib/queries/use-current-prices";
import { useHistoricalPrices } from "@/lib/queries/use-historical-prices";
import type { Province, Retailer, TimeRange } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  // Chart-specific filters
  const [chartProvince, setChartProvince] = useState<Province | undefined>(
    "TP. Hồ Chí Minh"
  );
  const [chartRetailer, setChartRetailer] = useState<Retailer | undefined>(
    "SJC"
  );
  const [chartRetailerProduct, setChartRetailerProduct] = useState<
    string | undefined
  >(undefined);

  const { data: retailerProducts } = useRetailerProducts(chartRetailer);

  /*
   * Derive the selected product:
   * 1. If user explicitly selected something (including "all"), use it.
   * 2. If 'undefined' (initial state) and we have products, default to first product.
   * 3. Otherwise (loading or no products), fallback to undefined (which implicitly means "all" in some contexts, or "none" in others).
   */
  const selectedProduct = useMemo(() => {
    if (chartRetailerProduct !== undefined) {
      return chartRetailerProduct;
    }
    if (retailerProducts?.data && retailerProducts.data.length > 0) {
      return retailerProducts.data[0].id;
    }
    return undefined;
  }, [chartRetailerProduct, retailerProducts]);

  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  // Price table shows all data (no filters)
  const { data, isLoading } = useCurrentPrices({
    province: undefined,
    retailer: undefined,
  });

  const { startDate, endDate } = useMemo(() => {
    const endDate = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "week":
        startDate = subDays(endDate, 7);
        break;
      case "month":
        startDate = subMonths(endDate, 1);
        break;
      case "quarter":
        startDate = subMonths(endDate, 3);
        break;
      case "year":
        startDate = subYears(endDate, 1);
        break;
      default:
        startDate = subMonths(endDate, 1);
    }

    return { startDate, endDate };
  }, [timeRange]);

  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
  } = useHistoricalPrices({
    retailer: chartRetailer,
    retailerProductId: selectedProduct === "all" ? undefined : selectedProduct,
    province: chartProvince,
    startDate,
    endDate,
    interval: "daily",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Giá Vàng Hôm Nay
              </h1>
              <p className="text-muted-foreground mt-2">
                Cập nhật giá vàng mới nhất từ các nhà bán lẻ lớn
              </p>
            </div>
            <RefreshIndicator />
          </div>
        </div>

        <div className="mb-6">
          <WorldGoldPrice />
        </div>

        <PriceTable data={data?.data || []} isLoading={isLoading} />

        <div className="mt-8 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Biểu Đồ Giá Vàng
            </h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <ChartTimeFilter value={timeRange} onChange={setTimeRange} />

            <RetailerFilter
              value={chartRetailer}
              onValueChange={(val) => {
                setChartRetailer(val);
                setChartRetailerProduct(undefined);
              }}
            />
            <RetailerProductFilter
              retailer={chartRetailer}
              value={selectedProduct}
              onValueChange={setChartRetailerProduct}
            />
            <ProvinceFilter
              value={chartProvince}
              onValueChange={setChartProvince}
            />
          </div>

          {chartLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : chartError ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Không thể tải dữ liệu biểu đồ
                </p>
              </CardContent>
            </Card>
          ) : chartData?.data && chartData.data.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Không có dữ liệu biểu đồ trong khoảng thời gian này
                </p>
              </CardContent>
            </Card>
          ) : (
            <PriceLineChart data={chartData?.data || []} />
          )}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Dữ liệu được cập nhật tự động mỗi 5 phút</p>
        </div>
      </main>
    </div>
  );
}
