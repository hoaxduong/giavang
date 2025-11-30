'use client'

import { useQuery } from '@tanstack/react-query'
import type { PortfolioStats } from '../types'

/**
 * Hook to fetch portfolio statistics
 */
export function usePortfolioStats() {
  return useQuery({
    queryKey: ['portfolio', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/portfolio/stats')

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio stats: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data as PortfolioStats
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

