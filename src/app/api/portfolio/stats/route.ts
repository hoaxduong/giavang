import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import type { PortfolioStats, PortfolioEntry } from "@/lib/types";

/**
 * Portfolio Stats API Route
 *
 * Calculates portfolio statistics:
 * - Total purchase period (tổng kỳ mua)
 * - Total gold amount
 * - Total VND invested
 * - Current VND value
 * - Profit/loss (VND and percentage)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    // Fetch all portfolio entries
    const { data: entries, error } = await supabase
      .from("user_portfolio")
      .select("*, productName:product_type")
      .eq("user_id", user.id);

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    const portfolioEntries = (entries || []) as PortfolioEntry[];

    // Calculate statistics
    const totalPurchasePeriod = portfolioEntries.length;
    const totalGoldAmount = portfolioEntries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0
    );
    const totalVndInvested = portfolioEntries.reduce(
      (sum, entry) => sum + Number(entry.amount) * Number(entry.buy_price),
      0
    );

    // Get current prices for all unique gold types
    const uniqueGoldTypes = new Map<
      string,
      { retailer: string; productName: string; province: string | null }
    >();
    portfolioEntries.forEach((entry) => {
      const key = `${entry.retailer}-${entry.productName}-${entry.province || ""}`;
      if (!uniqueGoldTypes.has(key)) {
        uniqueGoldTypes.set(key, {
          retailer: entry.retailer,
          productName: entry.productName,
          province: entry.province || null,
        });
      }
    });

    // Fetch current prices for each unique gold type
    // When calculating current value, use retailer's buy_price (what user would receive if selling now)
    const currentPricesMap = new Map<string, number>();
    for (const {
      retailer,
      productName,
      province,
    } of uniqueGoldTypes.values()) {
      let query = supabase
        .from("price_snapshots")
        .select("buy_price")
        .eq("retailer", retailer)
        .eq("product_name", productName)
        .order("created_at", { ascending: false })
        .limit(1);

      if (province) {
        query = query.eq("province", province);
      }

      const { data: priceData } = await query;

      if (priceData && priceData.length > 0) {
        const key = `${retailer}-${productName}-${province || ""}`;
        currentPricesMap.set(key, Number(priceData[0].buy_price));
      } else if (province) {
        // Fallback: try without province
        const fallbackQuery = supabase
          .from("price_snapshots")
          .select("buy_price")
          .eq("retailer", retailer)
          .eq("product_name", productName)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: fallbackData } = await fallbackQuery;
        if (fallbackData && fallbackData.length > 0) {
          const key = `${retailer}-${productName}-${province || ""}`;
          currentPricesMap.set(key, Number(fallbackData[0].buy_price));
        }
      }
    }

    // Calculate current value and profit/loss
    let currentVndValue = 0;
    let soldVndValue = 0;

    portfolioEntries.forEach((entry) => {
      if (entry.sold_at && entry.sell_price) {
        // For sold entries, use the sell price
        soldVndValue += Number(entry.amount) * Number(entry.sell_price);
      } else {
        // For unsold entries, use current price
        const key = `${entry.retailer}-${entry.productName}-${entry.province || ""}`;
        const currentPrice = currentPricesMap.get(key);
        if (currentPrice) {
          currentVndValue += Number(entry.amount) * currentPrice;
        }
      }
    });

    const totalCurrentValue = currentVndValue + soldVndValue;
    const profitLossVnd = totalCurrentValue - totalVndInvested;
    const profitLossPercent =
      totalVndInvested > 0 ? (profitLossVnd / totalVndInvested) * 100 : 0;

    const soldEntries = portfolioEntries.filter(
      (entry) => entry.sold_at
    ).length;
    const activeEntries = portfolioEntries.filter(
      (entry) => !entry.sold_at
    ).length;

    const stats: PortfolioStats = {
      totalPurchasePeriod,
      totalGoldAmount,
      totalVndInvested,
      currentVndValue: totalCurrentValue,
      profitLossVnd,
      profitLossPercent,
      soldEntries,
      activeEntries,
    };

    return NextResponse.json({
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch portfolio stats:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to fetch portfolio stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
