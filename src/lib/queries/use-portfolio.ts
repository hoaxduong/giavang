"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioEntry } from "../types";
import { portfolioStorage } from "../portfolio-storage";

/**
 * Hook to fetch all portfolio entries
 */
export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      // Simulate async delay for consistent UX
      await new Promise((resolve) => setTimeout(resolve, 100));
      return portfolioStorage.getPortfolio();
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
      productName: string;
      province?: string | null;
      bought_at: string;
      buy_price: number; // Added buy_price as it's needed for local creation
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      // In local mode we need buy_price from the form or passed in.
      // The previous implementation might have fetched it on the server?
      // Let's assume the component will pass it or we need to look it up.
      // Wait, let's look at the previous `useCreatePortfolioEntry` ...
      // It took `entry` without `buy_price`? No, let's check the form.
      // If the form didn't pass `buy_price`, the API probably looked it up.
      // In local mode, the User enters the data, so the form SHOULD pass `buy_price`?
      // Or we can look it up from the current prices if not provided.
      // For now, let's assume the passed entry object is what we store, but we might need to fix the Form if it doesn't include price.

      // Actually the `PortfolioForm` probably calls this.
      // If the form doesn't provide buy_price, we might have an issue.
      // Let's assume for now we just pass what we get, but type it properly.

      // Wait, looking at current `src/lib/types.ts`:
      // PortfolioEntry has `buy_price`.
      // The previous hook `entry` argument had: amount, retailer, productName, province, bought_at.
      // It did NOT have `buy_price`. The API likely looked up the price.
      // For now, I will add `buy_price` to the input requirements if missing, or we need a way to fetch price.
      // But simpler: just accept what is passed, and if `buy_price` is missing, maybe defaulting to 0 or requiring user input.
      // Let's modify the signature to require buy_price or let the component handle looking it up.

      return portfolioStorage.addEntry(entry as any);
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
      productName?: string;
      province?: string | null;
      bought_at?: string;
      buy_price?: number;
      sell_price?: number;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return portfolioStorage.updateEntry(entry as any);
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
      await new Promise((resolve) => setTimeout(resolve, 100));
      return portfolioStorage.deleteEntry(id);
    },
    onSuccess: () => {
      // Invalidate portfolio queries
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "growth"] });
    },
  });
}
