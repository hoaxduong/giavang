import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { goldPriceAPI } from '@/lib/api/gold-price-api'
import { priceDataToSnapshot } from '@/lib/api/price-normalizer'

/**
 * Price Sync API Route
 *
 * This endpoint should be called by a cron job every 5 minutes to sync prices
 * from the external API to the Supabase database.
 *
 * Setup Vercel Cron:
 * Create vercel.json in project root with cron schedule (every 5 minutes)
 *
 * For development/testing:
 * curl -X POST http://localhost:3000/api/prices/sync \
 *   -H "Authorization: Bearer your-cron-secret"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Fetch current prices from external API
    const currentPrices = await goldPriceAPI.getCurrentPrices()

    if (currentPrices.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No prices to sync',
        timestamp: new Date().toISOString(),
      })
    }

    // Convert to database format
    const snapshots = currentPrices.map(priceDataToSnapshot)

    // Insert into database
    const { data, error } = await supabase
      .from('price_snapshots')
      .insert(snapshots)
      .select()

    if (error) {
      console.error('Database insert error:', error)
      throw error
    }

    console.log(`Successfully synced ${data?.length || 0} price snapshots`)

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Price sync failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to sync prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for manual trigger (development only)
 * Remove this in production or add additional security
 */
export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to sync prices',
    usage: 'POST /api/prices/sync with Authorization: Bearer {CRON_SECRET}',
  })
}
