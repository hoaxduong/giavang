import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PriceSnapshot, EnrichedPriceSnapshot } from "@/lib/types";

/**
 * World Gold Price API Route
 *
 * Fetches the most recent XAUUSD (world gold) price snapshot from the database
 * XAUUSD is identified by unit="USD/oz"
 * Also calculates price change compared to previous day
 *
 * Example:
 * GET /api/prices/world-gold
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current date in VN timezone
    const referenceDate = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(referenceDate);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    // Start of current day in VN time
    const startOfCurrentDayVnIso = `${year}-${month}-${day}T00:00:00.000+07:00`;
    const startOfCurrentDayUtc = new Date(startOfCurrentDayVnIso);

    // Get the latest XAUUSD price (identified by unit="USD/oz")
    const { data: currentData, error: currentError } = await supabase
      .from("price_snapshots")
      .select("*")
      .eq("unit", "USD/oz")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (currentError) {
      // If no data found, return null instead of error
      if (currentError.code === "PGRST116") {
        return NextResponse.json({
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      console.error("Database query error:", currentError);
      throw currentError;
    }

    // Get yesterday's price for comparison
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from("price_snapshots")
      .select("*")
      .eq("unit", "USD/oz")
      .lt("created_at", startOfCurrentDayUtc.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (yesterdayError) {
      console.error("Error fetching yesterday's price:", yesterdayError);
    }

    // Calculate changes if we have both current and yesterday data
    let enrichedData: EnrichedPriceSnapshot = {
      ...(currentData as PriceSnapshot),
      retailer: "ONUS", // World gold is from ONUS
      product_name: "XAU/USD",
    };

    if (yesterdayData) {
      const currentBuyVal = Number(currentData.buy_price);
      const yesterdayBuyVal = Number(yesterdayData.buy_price);

      const buyChange = currentBuyVal - yesterdayBuyVal;
      const buyChangePercent =
        yesterdayBuyVal !== 0 ? (buyChange / yesterdayBuyVal) * 100 : 0;

      enrichedData = {
        ...enrichedData,
        buyChange,
        buyChangePercent,
      };
    }

    return NextResponse.json({
      data: enrichedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch world gold price:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch world gold price",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
