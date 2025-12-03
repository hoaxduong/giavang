import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { PriceData } from '@/lib/types'

/**
 * PriceDeduplicator
 *
 * Prevents duplicate price snapshot insertions during backfill.
 * Uses day-level precision since historical API returns daily aggregated prices.
 */
export class PriceDeduplicator {
  /**
   * Check if a price snapshot already exists for this date
   * Uses day-level precision (ignores time)
   *
   * @param snapshot - Price snapshot to check
   * @returns True if duplicate exists, false otherwise
   */
  async isDuplicate(snapshot: PriceData): Promise<boolean> {
    const supabase = createServiceRoleClient()

    // Extract date portion from createdAt
    const snapshotDate = new Date(snapshot.createdAt)
    const startOfDay = new Date(snapshotDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(snapshotDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Query for existing snapshot on same day
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('id')
      .eq('retailer', snapshot.retailer)
      .eq('province', snapshot.province)
      .eq('product_type', snapshot.productType)
      .eq('is_backfilled', true)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Deduplicator error:', error)
      return false // On error, assume not duplicate to avoid losing data
    }

    return data !== null
  }

  /**
   * Bulk filter out duplicates
   *
   * @param snapshots - Array of price snapshots
   * @returns Object with unique and duplicate snapshots
   */
  async filterDuplicates(snapshots: PriceData[]): Promise<{
    unique: PriceData[]
    duplicates: PriceData[]
  }> {
    const unique: PriceData[] = []
    const duplicates: PriceData[] = []

    // Check each snapshot
    for (const snapshot of snapshots) {
      const isDupe = await this.isDuplicate(snapshot)
      if (isDupe) {
        duplicates.push(snapshot)
      } else {
        unique.push(snapshot)
      }
    }

    return { unique, duplicates }
  }

  /**
   * Batch check for duplicates using a single query
   * More efficient for large batches
   *
   * @param snapshots - Array of price snapshots
   * @returns Object with unique and duplicate snapshots
   */
  async filterDuplicatesBatch(snapshots: PriceData[]): Promise<{
    unique: PriceData[]
    duplicates: PriceData[]
  }> {
    if (snapshots.length === 0) {
      return { unique: [], duplicates: [] }
    }

    const supabase = createServiceRoleClient()

    // Build query to check all snapshots at once
    // Group by date for efficient querying
    const dateGroups = new Map<string, PriceData[]>()
    for (const snapshot of snapshots) {
      const snapshotDate = new Date(snapshot.createdAt)
      const date = snapshotDate.toISOString().split('T')[0]
      const key = `${date}|${snapshot.retailer}|${snapshot.province}|${snapshot.productType}`

      if (!dateGroups.has(key)) {
        dateGroups.set(key, [])
      }
      dateGroups.get(key)!.push(snapshot)
    }

    // Check which combinations exist in database
    const existingSet = new Set<string>()

    for (const [key] of dateGroups) {
      const [date, retailer, province, productType] = key.split('|')

      const startOfDay = new Date(`${date}T00:00:00.000Z`)
      const endOfDay = new Date(`${date}T23:59:59.999Z`)

      const { data, error } = await supabase
        .from('price_snapshots')
        .select('id')
        .eq('retailer', retailer)
        .eq('province', province)
        .eq('product_type', productType)
        .eq('is_backfilled', true)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        existingSet.add(key)
      }
    }

    // Separate unique from duplicates
    const unique: PriceData[] = []
    const duplicates: PriceData[] = []

    for (const snapshot of snapshots) {
      const snapshotDate = new Date(snapshot.createdAt)
      const date = snapshotDate.toISOString().split('T')[0]
      const key = `${date}|${snapshot.retailer}|${snapshot.province}|${snapshot.productType}`

      if (existingSet.has(key)) {
        duplicates.push(snapshot)
      } else {
        unique.push(snapshot)
        // Add to set to avoid marking subsequent snapshots in same batch as duplicates
        existingSet.add(key)
      }
    }

    return { unique, duplicates }
  }
}
