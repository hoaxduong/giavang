"use client";

import { useMemo } from "react";
import { normalizePriceToVndPerChi } from "@/lib/utils";
import type { PortfolioStats } from "../types";
import { usePortfolio } from "./use-portfolio";
import { useCurrentPrices } from "./use-current-prices";

/**
 * Hook to calculate portfolio statistics
 */
export function usePortfolioStats() {
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio();
  const { data: pricesData, isLoading: isPricesLoading } = useCurrentPrices();

  const stats = useMemo<PortfolioStats | null>(() => {
    if (!portfolio || !pricesData?.data) return null;

    let totalGoldAmount = 0;
    let totalVndInvested = 0;
    let currentVndValue = 0;
    let soldEntries = 0;
    let activeEntries = 0;

    portfolio.forEach((entry) => {
      // Invested
      const invested = entry.buy_price ? entry.amount * entry.buy_price : 0;

      // For sold items, user probably should have entered sold_price.
      // But assuming we track current holdings:
      // The requirement "User can export/import their data" implies simple tracking.
      // Only active entries contribute to "Current Value".
      // Sold entries contribute to realized profit?
      // The types say: soldEntries, activeEntries.
      // Calculating totalVndInvested usually means for ACTIVE entries?
      // Or total money put in?
      // Let's assume stats are for CURRENT HOLDINGS mostly, but let's check definition.
      // `totalGoldAmount`: Total gold in chỉ.
      // `currentVndValue`: based on current sell prices.

      // I'll assume only active entries count for gold amount and current value.

      if (entry.sold_at) {
        soldEntries++;
        // We could track realized profit if we had sell_price
      } else {
        activeEntries++;
        totalGoldAmount += entry.amount;
        totalVndInvested += invested;

        // Find current price for this product
        // Try to match by retailer + product name, or just retailer + product info
        // The entry has `productName` and `retailer`.
        // The prices have `product_name` and `retailer`.
        // Find current price for this product
        // Priority:
        // 1. Exact match (Retailer + Product + Specific Province)
        // 2. Generic match (Retailer + Product + Empty Province)
        let currentPrice = pricesData.data.find(
          (p) =>
            p.retailer === entry.retailer &&
            p.product_name === entry.productName &&
            p.province === (entry.province || "")
        );

        // If specific province match failed and we have a province in entry, try generic
        if (!currentPrice && entry.province) {
          currentPrice = pricesData.data.find(
            (p) =>
              p.retailer === entry.retailer &&
              p.product_name === entry.productName &&
              p.province === ""
          );
        }

        // Calculate value using buy_price (what retailer pays user)
        // If not found, use entry.buy_price (break-even assumption)
        // IMPORTANT: Normalize price unit (Lượng -> Chỉ)
        const marketPrice = currentPrice
          ? normalizePriceToVndPerChi(currentPrice.buy_price, currentPrice.unit)
          : entry.buy_price || 0;

        currentVndValue += entry.amount * marketPrice;
      }
    });

    const profitLossVnd = currentVndValue - totalVndInvested;
    const profitLossPercent =
      totalVndInvested > 0 ? (profitLossVnd / totalVndInvested) * 100 : 0;

    return {
      totalPurchasePeriod: portfolio.length,
      totalGoldAmount,
      totalVndInvested,
      currentVndValue,
      profitLossVnd,
      profitLossPercent,
      soldEntries,
      activeEntries,
    };
  }, [portfolio, pricesData]);

  return {
    data: stats,
    isLoading: isPortfolioLoading || isPricesLoading,
    error: null,
  };
}
