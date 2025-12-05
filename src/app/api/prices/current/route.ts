import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PriceSnapshot, EnrichedPriceSnapshot } from "@/lib/types";

/**
 * Current Prices API Route
 *
 * Fetches the most recent price snapshots from the database
 * Supports filtering by retailer, province
 *
 * Query parameters:
 * - retailer: Filter by retailer name (e.g., "SJC", "DOJI")
 * - province: Filter by province (e.g., "TP. Hồ Chí Minh")
 *
 * Example:
 * GET /api/prices/current?retailer=SJC&province=TP.%20Hồ%20Chí%20Minh
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const retailer = searchParams.get("retailer");
    const province = searchParams.get("province");

    const supabase = await createClient();

    // Calculate start of today in VN time (UTC+7) robustly
    // Calculate reference date (either now or user selected date)
    // We want "current" to mean "latest available at end of reference date"
    // And "yesterday" to mean "latest available before start of reference date"

    let referenceDate = new Date();
    const dateParam = searchParams.get("date");
    if (dateParam) {
      referenceDate = new Date(dateParam);
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Get parts for reference date in VN time
    const parts = formatter.formatToParts(referenceDate);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    // Start of the reference day (00:00:00 VN time) - cutoff for yesterday data
    const startOfCurrentDayVnIso = `${year}-${month}-${day}T00:00:00.000+07:00`;
    const startOfCurrentDayUtc = new Date(startOfCurrentDayVnIso);

    // End of the reference day (start of next day) - cutoff for current data
    // If date is today, this will be start of tomorrow, effectively showing all data from today
    const startOfNextDayUtc = new Date(startOfCurrentDayUtc);
    startOfNextDayUtc.setDate(startOfNextDayUtc.getDate() + 1);

    // Helper to build query
    const buildQuery = () => {
      let query = supabase
        .from("price_snapshots")
        .select(
          "*, retailer_products!inner(product_name, is_enabled, retailer_code)"
        )
        .eq("retailer_products.is_enabled", true)
        .order("created_at", { ascending: false })
        .limit(5000); // Limit to prevent fetching too many records while ensuring we get all combinations

      // Apply filters if provided
      if (retailer) {
        query = query.eq("retailer_products.retailer_code", retailer);
      }
      if (province) {
        query = query.eq("province", province);
      }
      // Always limit to before the end of the reference day
      query = query.lt("created_at", startOfNextDayUtc.toISOString());

      return query;
    };

    // Execute current query first
    const { data: rawCurrentData, error: currentError } = await buildQuery();

    if (currentError) throw currentError;

    // Process raw data
    const processData = (rawData: unknown[]) =>
      (rawData || []).map((item) => {
        const joinedItem = item as PriceSnapshot & {
          retailer_products: {
            product_name: string;
            retailer_code: string;
          } | null;
        };

        return {
          ...joinedItem,
          product_name: joinedItem.retailer_products?.product_name || null,
          retailer: joinedItem.retailer_products?.retailer_code || "unknown",
        } as EnrichedPriceSnapshot;
      });

    const currentData = getLatestPrices(processData(rawCurrentData));

    // Group product IDs by retailer code to optimize partial fetching
    // (Avoiding one huge query that might hit limits or timeout)
    const productsByRetailer: Record<string, string[]> = {};
    currentData.forEach((p) => {
      const r = p.retailer;
      if (!productsByRetailer[r]) productsByRetailer[r] = [];
      if (p.retailer_product_id)
        productsByRetailer[r].push(p.retailer_product_id);
    });

    const yesterdayData: EnrichedPriceSnapshot[] = [];

    // Fetch yesterday data for each retailer in parallel
    const retailerQueries = Object.entries(productsByRetailer).map(
      async ([retailerCode, ids]) => {
        if (ids.length === 0) return [];

        // Increase limit per product to ensure we capture the latest record
        // even if there are many updates in the day.
        // Assuming max 100 updates per product per day is safe enough coverage
        // for "finding the latest one".
        const limit = Math.min(ids.length * 100, 2000);

        const { data, error } = await supabase
          .from("price_snapshots")
          .select(
            "*, retailer_products!inner(product_name, is_enabled, retailer_code)"
          )
          .eq("retailer_products.is_enabled", true)
          .eq("retailer_products.retailer_code", retailerCode)
          .lt("created_at", startOfCurrentDayUtc.toISOString())
          .in("retailer_product_id", ids)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) {
          console.error(
            `Error fetching yesterday prices for ${retailerCode}:`,
            error
          );
          return [];
        }

        return processData(data || []);
      }
    );

    const retailerResults = await Promise.all(retailerQueries);
    retailerResults.forEach((results) => {
      // We might get multiple rows per product, we only need the latest one (which is first due to sort)
      // usage of getLatestPrices will handle deduping
      yesterdayData.push(...results);
    });

    // Deduplicate to get strictly the single latest price per product
    const latestYesterdayData = getLatestPrices(yesterdayData);

    // Create map for yesterday's prices for quick lookup
    const yesterdayMap = new Map<string, EnrichedPriceSnapshot>();
    latestYesterdayData.forEach((p) => {
      const uniqueId = p.retailer_product_id || p.product_name || "unknown";
      const key = `${p.retailer}-${p.province}-${uniqueId}`;
      yesterdayMap.set(key, p);
    });

    // Calculate changes
    const result = currentData.map((price) => {
      const uniqueId =
        price.retailer_product_id || price.product_name || "unknown";
      const key = `${price.retailer}-${price.province}-${uniqueId}`;
      const yesterdayPrice = yesterdayMap.get(key);

      if (yesterdayPrice) {
        // Calculate change based on both buy and sell prices
        const currentBuyVal = Number(price.buy_price);
        const yesterdayBuyVal = Number(yesterdayPrice.buy_price);

        const buyChange = currentBuyVal - yesterdayBuyVal;
        const buyChangePercent =
          yesterdayBuyVal !== 0 ? (buyChange / yesterdayBuyVal) * 100 : 0;

        const currentSellVal = Number(price.sell_price);
        const yesterdaySellVal = Number(yesterdayPrice.sell_price);

        const sellChange = currentSellVal - yesterdaySellVal;
        const sellChangePercent =
          yesterdaySellVal !== 0 ? (sellChange / yesterdaySellVal) * 100 : 0;

        return {
          ...price,
          buyChange,
          buyChangePercent,
          sellChange,
          sellChangePercent,
        };
      }

      return price;
    });

    return NextResponse.json({
      data: result,
      count: result.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch current prices:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch prices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get the latest price for each unique combination
 * of retailer, province, and product
 */
function getLatestPrices(
  prices: EnrichedPriceSnapshot[]
): EnrichedPriceSnapshot[] {
  const latestMap = new Map<string, EnrichedPriceSnapshot>();

  for (const price of prices) {
    // Use retailer_product_id for uniqueness if available, otherwise fallback to product_name
    const uniqueId =
      price.retailer_product_id || price.product_name || "unknown";
    const key = `${price.retailer}-${price.province}-${uniqueId}`;

    const existing = latestMap.get(key);
    if (
      !existing ||
      new Date(price.created_at) > new Date(existing.created_at)
    ) {
      latestMap.set(key, price);
    }
  }

  return Array.from(latestMap.values()).sort((a, b) =>
    a.retailer.localeCompare(b.retailer)
  );
}
