import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Historical Prices API Route
 *
 * Fetches historical price data for charts and analysis
 *
 * Required query parameters:

 * - startDate: Start date in ISO format (e.g., "2024-01-01")
 * - endDate: End date in ISO format (e.g., "2024-01-31")
 *
 * Optional query parameters:
 * - retailer: Filter by specific retailer
 * - province: Filter by specific province
 * - interval: Grouping interval ("hourly", "daily", "weekly") - default: "daily"
 *
 * Example:
 * GET /api/prices/historical?startDate=2024-01-01&endDate=2024-01-31&interval=daily
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Required parameters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: ["startDate", "endDate"],
        },
        { status: 400 }
      );
    }

    // Optional parameters
    const retailer = searchParams.get("retailer");
    const province = searchParams.get("province");
    const interval = searchParams.get("interval") || "daily";

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("price_snapshots")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (retailer) {
      query = query.eq("retailer", retailer);
    }
    if (province) {
      query = query.eq("province", province);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    // Aggregate data based on interval
    const aggregatedData = aggregateByInterval(
      data || [],
      interval as "hourly" | "daily" | "weekly"
    );

    return NextResponse.json({
      data: aggregatedData,
      count: aggregatedData.length,
      interval,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch historical prices:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch historical prices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Aggregate price data by time interval
 */
function aggregateByInterval(
  prices: any[],
  interval: "hourly" | "daily" | "weekly"
): any[] {
  if (prices.length === 0) return [];

  const grouped = new Map<string, any[]>();

  for (const price of prices) {
    const date = new Date(price.created_at);
    let key: string;

    switch (interval) {
      case "hourly":
        // Group by hour
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
        break;
      case "weekly":
        // Group by week (ISO week)
        const weekNumber = getWeekNumber(date);
        key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
        break;
      case "daily":
      default:
        // Group by day
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        break;
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(price);
  }

  // Calculate average prices for each interval
  const result = [];
  for (const [key, groupPrices] of grouped) {
    const avgBuyPrice =
      groupPrices.reduce((sum, p) => sum + Number(p.buy_price), 0) /
      groupPrices.length;
    const avgSellPrice =
      groupPrices.reduce((sum, p) => sum + Number(p.sell_price), 0) /
      groupPrices.length;

    // Use the latest timestamp in the group
    const latestPrice = groupPrices[groupPrices.length - 1];

    result.push({
      created_at: latestPrice.created_at,
      retailer: latestPrice.retailer,
      province: latestPrice.province,
      buy_price: Math.round(avgBuyPrice),
      sell_price: Math.round(avgSellPrice),
      unit: latestPrice.unit,
      interval_key: key,
    });
  }

  return result;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
