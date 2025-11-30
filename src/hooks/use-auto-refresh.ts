'use client'

import { useState, useEffect } from 'react'
import { REFRESH_INTERVAL } from '@/lib/constants'

/**
 * Hook to track time until next auto-refresh
 *
 * Returns:
 * - secondsUntilRefresh: Countdown in seconds
 * - progress: Progress percentage (0-100)
 */
export function useAutoRefresh(lastUpdateTime?: Date | null) {
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(0)

  useEffect(() => {
    if (!lastUpdateTime) return

    const calculateSecondsRemaining = () => {
      const now = Date.now()
      const lastUpdate = lastUpdateTime.getTime()
      const nextRefresh = lastUpdate + REFRESH_INTERVAL
      const remaining = Math.max(0, nextRefresh - now)

      return Math.floor(remaining / 1000)
    }

    // Update immediately
    setSecondsUntilRefresh(calculateSecondsRemaining())

    // Update every second
    const interval = setInterval(() => {
      setSecondsUntilRefresh(calculateSecondsRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [lastUpdateTime])

  const progress = ((REFRESH_INTERVAL / 1000 - secondsUntilRefresh) / (REFRESH_INTERVAL / 1000)) * 100

  return { secondsUntilRefresh, progress }
}
