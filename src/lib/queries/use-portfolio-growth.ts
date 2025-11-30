'use client'

import { useQuery } from '@tanstack/react-query'
import type { PortfolioGrowthResponse } from '../types'

/**
 * Hook to fetch portfolio growth data
 */
export function usePortfolioGrowth(groupBy: 'total' | 'monthly' | 'yearly' = 'total') {
  return useQuery({
    queryKey: ['portfolio', 'growth', groupBy],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/growth?groupBy=${groupBy}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio growth: ${response.statusText}`)
      }

      return response.json() as Promise<PortfolioGrowthResponse>
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

