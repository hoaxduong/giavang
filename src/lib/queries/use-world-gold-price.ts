'use client'

import { useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL } from '../constants'
import type { PriceSnapshot } from '../types'

/**
 * API Response type for world gold price
 */
interface WorldGoldPriceResponse {
  data: PriceSnapshot | null
  timestamp: string
}

/**
 * Hook to fetch world gold price (XAUUSD)
 *
 * Features:
 * - Auto-refetches every 5 minutes
 * - Caches data for 5 minutes
 * - Fetches from database (synced via cron)
 */
export function useWorldGoldPrice() {
  const query = useQuery({
    queryKey: ['prices', 'world-gold'],
    queryFn: async () => {
      const response = await fetch('/api/prices/world-gold')

      if (!response.ok) {
        throw new Error(`Failed to fetch world gold price: ${response.statusText}`)
      }

      return response.json() as Promise<WorldGoldPriceResponse>
    },
    staleTime: REFRESH_INTERVAL, // 5 minutes
    gcTime: REFRESH_INTERVAL * 2, // 10 minutes
    refetchInterval: REFRESH_INTERVAL, // Auto-refetch every 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  return query
}

