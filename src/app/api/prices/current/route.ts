import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchDailyPrices } from "@/lib/prices";

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
    const retailer = searchParams.get("retailer") || undefined;
    const province = searchParams.get("province") || undefined;

    const supabase = await createClient();

    let date: Date | undefined;
    const dateParam = searchParams.get("date");
    if (dateParam) {
      date = new Date(dateParam);
    }

    const result = await fetchDailyPrices(supabase, {
      retailer,
      province,
      date,
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
