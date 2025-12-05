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

    // Get the latest price for each retailer/product/province combination
    // We fetch recent records ordered by created_at DESC, then filter to get
    // the latest price for each unique combination (regardless of when it was updated)
    // Using a reasonable limit to balance performance and completeness
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

    const { data: rawData, error } = await query;

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    // Map the joined data to flat structure
    const data = (rawData || []).map((item) => {
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

    // Get the latest price for each retailer/province/product combination
    // This ensures we get the most recent price regardless of when it was last updated
    const latestPrices = getLatestPrices(data);

    return NextResponse.json({
      data: latestPrices,
      count: latestPrices.length,
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
