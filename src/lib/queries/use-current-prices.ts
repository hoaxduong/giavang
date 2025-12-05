"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { PriceFilters, CurrentPricesResponse } from "../types";
import { REFRESH_INTERVAL } from "../constants";

/**
 * Hook to fetch current gold prices
 *
 * Features:
 * - Auto-refetches every 5 minutes
 * - Caches data for 5 minutes
 * - Supports filtering by retailer, province
 * - Prefetches related data
 */
export function useCurrentPrices(filters?: PriceFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prices", "current", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.retailer) params.append("retailer", filters.retailer);
      if (filters?.province) params.append("province", filters.province);

      const url = `/api/prices/current${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.statusText}`);
      }

      return response.json() as Promise<CurrentPricesResponse>;
    },
    staleTime: REFRESH_INTERVAL, // 5 minutes
    gcTime: REFRESH_INTERVAL * 2, // 10 minutes
    refetchInterval: REFRESH_INTERVAL, // Auto-refetch every 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Prefetch all prices when filtered data is loaded
  // This improves UX when removing filters
  useEffect(() => {
    if (query.data && filters) {
      queryClient.prefetchQuery({
        queryKey: ["prices", "current", undefined],
        queryFn: async () => {
          const response = await fetch("/api/prices/current");
          return response.json();
        },
      });
    }
  }, [query.data, filters, queryClient]);

  return query;
}

/**
 * Get last update timestamp from the query
 */
export function useLastUpdateTime() {
  const { data } = useCurrentPrices();
  return data?.timestamp ? new Date(data.timestamp) : null;
}
