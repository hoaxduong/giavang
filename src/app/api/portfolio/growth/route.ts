import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import type {
  PortfolioGrowthResponse,
  PortfolioGrowthDataPoint,
  PortfolioEntry,
} from "@/lib/types";

/**
 * Portfolio Growth API Route
 *
 * Get growth chart data with grouping (total/monthly/yearly)
 * Query parameters: groupBy (total|monthly|yearly)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const groupBy = (searchParams.get("groupBy") || "total") as
      | "total"
      | "monthly"
      | "yearly";

    // Fetch all portfolio entries
    const { data: entries, error } = await supabase
      .from("user_portfolio")
      .select("*")
      .eq("user_id", user.id)
      .order("bought_at", { ascending: true });

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    const portfolioEntries = (entries || []) as PortfolioEntry[];

    if (portfolioEntries.length === 0) {
      return NextResponse.json({
        data: [],
        groupBy,
        timestamp: new Date().toISOString(),
      });
    }

    // Get all unique dates we need to calculate values for
    const dates = new Set<string>();
    portfolioEntries.forEach((entry) => {
      dates.add(entry.bought_at);
      if (entry.sold_at) {
        dates.add(entry.sold_at);
      }
    });

    // Add current date
    dates.add(new Date().toISOString());

    // Get all price snapshots we need
    const uniqueGoldTypes = new Map<
      string,
      { retailer: string; productType: string; province: string | null }
    >();
    portfolioEntries.forEach((entry) => {
      const key = `${entry.retailer}-${entry.product_type}-${entry.province || ""}`;
      if (!uniqueGoldTypes.has(key)) {
        uniqueGoldTypes.set(key, {
          retailer: entry.retailer,
          productType: entry.product_type,
          province: entry.province || null,
        });
      }
    });

    // Fetch price snapshots for all dates and gold types
    const priceCache = new Map<string, number>(); // key: "date-retailer-productType-province" -> sell_price

    for (const date of dates) {
      for (const {
        retailer,
        productType,
        province,
      } of uniqueGoldTypes.values()) {
        // Use buy_price (retailer's buy price) for current value calculations
        // This is what the user would receive if selling at this date
        let query = supabase
          .from("price_snapshots")
          .select("buy_price")
          .eq("retailer", retailer)
          .eq("product_type", productType)
          .lte("created_at", date)
          .order("created_at", { ascending: false })
          .limit(1);

        if (province) {
          query = query.eq("province", province);
        }

        const { data: priceData } = await query;

        if (priceData && priceData.length > 0) {
          const key = `${date}-${retailer}-${productType}-${province || ""}`;
          priceCache.set(key, Number(priceData[0].buy_price));
        } else if (province) {
          // Fallback: try without province
          const fallbackQuery = supabase
            .from("price_snapshots")
            .select("buy_price")
            .eq("retailer", retailer)
            .eq("product_type", productType)
            .lte("created_at", date)
            .order("created_at", { ascending: false })
            .limit(1);

          const { data: fallbackData } = await fallbackQuery;
          if (fallbackData && fallbackData.length > 0) {
            const key = `${date}-${retailer}-${productType}-${province || ""}`;
            priceCache.set(key, Number(fallbackData[0].buy_price));
          }
        }
      }
    }

    // Calculate portfolio value at each date
    const sortedDates = Array.from(dates).sort();
    const growthData: PortfolioGrowthDataPoint[] = [];

    for (const date of sortedDates) {
      let value = 0;
      let invested = 0;

      portfolioEntries.forEach((entry) => {
        const entryDate = new Date(entry.bought_at);
        const currentDate = new Date(date);

        // Only count entries that were bought before or at this date
        if (entryDate <= currentDate) {
          invested += Number(entry.amount) * Number(entry.buy_price);

          if (entry.sold_at) {
            const soldDate = new Date(entry.sold_at);
            if (soldDate <= currentDate) {
              // Entry was sold before this date, use sell price
              value += Number(entry.amount) * Number(entry.sell_price || 0);
            } else {
              // Entry not sold yet at this date, use current price
              const key = `${date}-${entry.retailer}-${entry.product_type}-${entry.province || ""}`;
              const currentPrice = priceCache.get(key) || 0;
              value += Number(entry.amount) * currentPrice;
            }
          } else {
            // Entry not sold, use current price at this date
            const key = `${date}-${entry.retailer}-${entry.product_type}-${entry.province || ""}`;
            const currentPrice = priceCache.get(key) || 0;
            value += Number(entry.amount) * currentPrice;
          }
        }
      });

      const profitLoss = value - invested;

      growthData.push({
        date,
        value,
        invested,
        profitLoss,
      });
    }

    // Group data based on groupBy parameter
    let groupedData: PortfolioGrowthDataPoint[] = [];

    if (groupBy === "total") {
      // Return all data points
      groupedData = growthData;
    } else if (groupBy === "monthly") {
      // Group by month
      const monthlyMap = new Map<string, PortfolioGrowthDataPoint>();

      growthData.forEach((point) => {
        const date = new Date(point.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const lastDayOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        );

        // Use the last day of the month
        if (
          !monthlyMap.has(monthKey) ||
          new Date(point.date) > new Date(monthlyMap.get(monthKey)!.date)
        ) {
          monthlyMap.set(monthKey, {
            ...point,
            date: lastDayOfMonth.toISOString(),
          });
        }
      });

      groupedData = Array.from(monthlyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    } else if (groupBy === "yearly") {
      // Group by year
      const yearlyMap = new Map<string, PortfolioGrowthDataPoint>();

      growthData.forEach((point) => {
        const date = new Date(point.date);
        const yearKey = String(date.getFullYear());
        const lastDayOfYear = new Date(date.getFullYear(), 11, 31);

        // Use the last day of the year
        if (
          !yearlyMap.has(yearKey) ||
          new Date(point.date) > new Date(yearlyMap.get(yearKey)!.date)
        ) {
          yearlyMap.set(yearKey, {
            ...point,
            date: lastDayOfYear.toISOString(),
          });
        }
      });

      groupedData = Array.from(yearlyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    }

    const response: PortfolioGrowthResponse = {
      data: groupedData,
      groupBy,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch portfolio growth:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to fetch portfolio growth",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
