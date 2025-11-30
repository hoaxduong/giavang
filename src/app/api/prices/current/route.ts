import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PriceSnapshot } from '@/lib/types'

/**
 * Current Prices API Route
 *
 * Fetches the most recent price snapshots from the database
 * Supports filtering by retailer, province, and product_type
 *
 * Query parameters:
 * - retailer: Filter by retailer name (e.g., "SJC", "DOJI")
 * - province: Filter by province (e.g., "TP. Hồ Chí Minh")
 * - productType: Filter by product type (e.g., "SJC_BARS")
 *
 * Example:
 * GET /api/prices/current?retailer=SJC&province=TP.%20Hồ%20Chí%20Minh
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const retailer = searchParams.get('retailer')
    const province = searchParams.get('province')
    const productType = searchParams.get('productType')

    const supabase = await createClient()

    // Get prices from the last 10 minutes
    // This ensures we get fresh data even if cron job is delayed
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    let query = supabase
      .from('price_snapshots')
      .select('*')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (retailer) {
      query = query.eq('retailer', retailer)
    }
    if (province) {
      query = query.eq('province', province)
    }
    if (productType) {
      query = query.eq('product_type', productType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database query error:', error)
      throw error
    }

    // Get the latest price for each retailer/province/product combination
    const latestPrices = getLatestPrices(data || [])

    return NextResponse.json({
      data: latestPrices,
      count: latestPrices.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch current prices:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get the latest price for each unique combination
 * of retailer, province, and product_type
 */
function getLatestPrices(prices: PriceSnapshot[]): PriceSnapshot[] {
  const latestMap = new Map<string, PriceSnapshot>()

  for (const price of prices) {
    const key = `${price.retailer}-${price.province}-${price.product_type}`

    const existing = latestMap.get(key)
    if (!existing || new Date(price.created_at) > new Date(existing.created_at)) {
      latestMap.set(key, price)
    }
  }

  return Array.from(latestMap.values()).sort((a, b) =>
    a.retailer.localeCompare(b.retailer)
  )
}
