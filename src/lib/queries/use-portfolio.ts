"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioEntry } from "../types";

/**
 * Hook to fetch all portfolio entries
 */
export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const response = await fetch("/api/portfolio");

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data as PortfolioEntry[];
    },
  });
}

/**
 * Hook to create a new portfolio entry
 */
export function useCreatePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      amount: number;
      retailer: string;
      product_type: string;
      province?: string | null;
      bought_at: string;
    }) => {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details || error.error || "Failed to create portfolio entry",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate portfolio queries
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "growth"] });
    },
  });
}

/**
 * Hook to update a portfolio entry
 */
export function useUpdatePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      id: string;
      sold_at?: string;
      amount?: number;
      retailer?: string;
      product_type?: string;
      province?: string | null;
      bought_at?: string;
    }) => {
      const response = await fetch("/api/portfolio", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details || error.error || "Failed to update portfolio entry",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate portfolio queries
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "growth"] });
    },
  });
}

/**
 * Hook to delete a portfolio entry
 */
export function useDeletePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/portfolio?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details || error.error || "Failed to delete portfolio entry",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate portfolio queries
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "growth"] });
    },
  });
}
