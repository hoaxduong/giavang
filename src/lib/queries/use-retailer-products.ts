"use client";

import { useQuery } from "@tanstack/react-query";
import type { Retailer } from "@/lib/constants";

interface RetailerProductShort {
  id: string;
  retailerCode: string;
  productName: string;
}

interface RetailerProductsResponse {
  data: RetailerProductShort[];
  count: number;
  timestamp: string;
}

export function useRetailerProducts(retailer?: Retailer) {
  return useQuery({
    queryKey: ["retailer-products", retailer],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (retailer) {
        params.append("retailer", retailer);
      }

      const response = await fetch(`/api/retailer-products?${params}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch retailer products: ${response.statusText}`
        );
      }

      return response.json() as Promise<RetailerProductsResponse>;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: true, // Always fetch, filter mainly helps reduce data
  });
}
