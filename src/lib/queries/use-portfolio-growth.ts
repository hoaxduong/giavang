"use client";

import { useQuery } from "@tanstack/react-query";
import type { PortfolioGrowthResponse } from "../types";

/**
 * Hook to fetch portfolio growth data
 */
export function usePortfolioGrowth(
  groupBy: "total" | "monthly" | "yearly" = "total"
) {
  return useQuery({
    queryKey: ["portfolio", "growth", groupBy],
    queryFn: async () => {
      // Local storage implementation does not support historical growth calculation yet
      return {
        data: [],
        groupBy,
        timestamp: new Date().toISOString(),
      } as PortfolioGrowthResponse;
    },
  });
}
