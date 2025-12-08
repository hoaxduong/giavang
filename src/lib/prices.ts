import { SupabaseClient } from "@supabase/supabase-js";
import type { PriceSnapshot, EnrichedPriceSnapshot } from "./types";

/**
 * Helper function to get the latest price for each unique combination
 * of retailer, province, and product
 */
export function getLatestPrices(
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

  return Array.from(latestMap.values()).sort((a, b) => {
    // First sort by retailer sort_order
    const retailerSortA = a.retailer_sort_order ?? 999999;
    const retailerSortB = b.retailer_sort_order ?? 999999;
    if (retailerSortA !== retailerSortB) {
      return retailerSortA - retailerSortB;
    }

    // Then sort by product sort_order
    const sortOrderA = a.sort_order ?? 999999;
    const sortOrderB = b.sort_order ?? 999999;
    return sortOrderA - sortOrderB;
  });
}

export type FetchPricesOptions = {
  retailer?: string;
  province?: string;
  date?: Date;
};

export async function fetchDailyPrices(
  supabase: SupabaseClient,
  options: FetchPricesOptions = {}
) {
  const { retailer, province, date } = options;
  const referenceDate = date || new Date();

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
  const startOfNextDayUtc = new Date(startOfCurrentDayUtc);
  startOfNextDayUtc.setDate(startOfNextDayUtc.getDate() + 1);

  // Helper to build query
  const buildQuery = () => {
    let query = supabase
      .from("price_snapshots")
      .select(
        "*, retailer_products!inner(product_name, is_enabled, retailer_code, sort_order, retailers!inner(sort_order))"
      )
      .eq("retailer_products.is_enabled", true)
      .order("created_at", { ascending: false })
      .limit(5000);

    // Apply filters if provided
    if (retailer) {
      query = query.eq("retailer_products.retailer_code", retailer);
    }
    if (province) {
      query = query.eq("province", province);
    }
    // Always limit to before the end of the reference day
    query = query
      .neq("unit", "USD/oz")
      .lt("created_at", startOfNextDayUtc.toISOString());

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
          sort_order: number;
          retailers: {
            sort_order: number;
          } | null;
        } | null;
      };

      return {
        ...joinedItem,
        product_name: joinedItem.retailer_products?.product_name || null,
        retailer: joinedItem.retailer_products?.retailer_code || "unknown",
        sort_order: joinedItem.retailer_products?.sort_order,
        retailer_sort_order:
          joinedItem.retailer_products?.retailers?.sort_order,
      } as EnrichedPriceSnapshot;
    });

  const currentData = getLatestPrices(processData(rawCurrentData));

  // Group product IDs by retailer code to optimize partial fetching
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

      const limit = Math.min(ids.length * 100, 2000);

      const { data, error } = await supabase
        .from("price_snapshots")
        .select(
          "*, retailer_products!inner(product_name, is_enabled, retailer_code, sort_order, retailers!inner(sort_order))"
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

  return result;
}
