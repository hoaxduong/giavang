import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PriceSnapshot } from "@/lib/types";

/**
 * World Gold Price API Route
 *
 * Fetches the most recent XAUUSD (world gold) price snapshot from the database
 * XAUUSD is identified by unit="USD/oz" and retailer="SJC"
 *
 * Example:
 * GET /api/prices/world-gold
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the latest XAUUSD price (identified by unit="USD/oz")
    const { data, error } = await supabase
      .from("price_snapshots")
      .select("*")
      .eq("unit", "USD/oz")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no data found, return null instead of error
      if (error.code === "PGRST116") {
        return NextResponse.json({
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      console.error("Database query error:", error);
      throw error;
    }

    return NextResponse.json({
      data: data as PriceSnapshot | null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch world gold price:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch world gold price",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
