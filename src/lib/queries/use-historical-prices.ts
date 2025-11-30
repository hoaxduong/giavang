'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { HistoricalFilters, HistoricalPricesResponse } from '../types'

/**
 * Hook to fetch historical gold prices for charts
 *
 * Features:
 * - Queries time-series data by date range
 * - Supports interval grouping (hourly/daily/weekly)
 * - Caches data for 10 minutes (historical data changes less frequently)
 * - Filters by retailer, province, product type
 */
export function useHistoricalPrices(filters: HistoricalFilters) {
  return useQuery({
    queryKey: ['prices', 'historical', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(filters.startDate, 'yyyy-MM-dd'),
        endDate: format(filters.endDate, 'yyyy-MM-dd'),
        interval: filters.interval || 'daily',
      })

      if (filters.productType) {
        params.append('productType', filters.productType)
      }
      if (filters.retailer) {
        params.append('retailer', filters.retailer)
      }
      if (filters.province) {
        params.append('province', filters.province)
      }

      const response = await fetch(`/api/prices/historical?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch historical prices: ${response.statusText}`)
      }

      return response.json() as Promise<HistoricalPricesResponse>
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!filters.productType && !!filters.startDate && !!filters.endDate,
  })
}
