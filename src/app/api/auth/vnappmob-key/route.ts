import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * API Key Management for vnappmob.com
 *
 * Endpoints:
 * - POST /api/auth/vnappmob-key/request - Request new API key from vnappmob
 * - GET /api/auth/vnappmob-key/current - Get current valid API key
 * - POST /api/auth/vnappmob-key/refresh - Refresh API key if expired/expiring soon
 */

interface VnappmobKeyResponse {
  results?: string // JWT token
}

interface JWTPayload {
  exp: number // Expiration timestamp
  iat: number // Issued at timestamp
  scope: string
  permission: number
}

/**
 * Decode JWT token to get expiration time
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded) as JWTPayload
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Request a new API key from vnappmob
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (only cron jobs or admin can request keys)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Request new API key from vnappmob
    const keyResponse = await fetch(
      'https://api.vnappmob.com/api/request_api_key?scope=gold',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!keyResponse.ok) {
      console.error('Failed to request API key:', keyResponse.status)
      return NextResponse.json(
        { error: 'Failed to request API key from vnappmob' },
        { status: 502 }
      )
    }

    const keyData: VnappmobKeyResponse = await keyResponse.json()

    if (!keyData.results) {
      console.error('No API key in response:', keyData)
      return NextResponse.json(
        { error: 'Invalid response from vnappmob', details: keyData },
        { status: 502 }
      )
    }

    // The API key is a JWT token in the 'results' field
    const apiKey = keyData.results

    // Decode JWT to get expiration time
    const jwtPayload = decodeJWT(apiKey)
    if (!jwtPayload) {
      console.error('Failed to decode JWT token')
      return NextResponse.json(
        { error: 'Invalid JWT token received' },
        { status: 502 }
      )
    }

    // Convert Unix timestamp to Date
    const expiresAt = new Date(jwtPayload.exp * 1000)
    const issuedAt = new Date(jwtPayload.iat * 1000)

    // Calculate days until expiry
    const now = new Date()
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Store the new API key in database
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        provider: 'vnappmob',
        scope: 'gold',
        api_key: apiKey,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        notes: `Auto-requested on ${new Date().toISOString()}. JWT issued at ${issuedAt.toISOString()}`,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store API key:', insertError)
      return NextResponse.json(
        { error: 'Failed to store API key', details: insertError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key requested and stored successfully',
      key: {
        id: newKey.id,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        expires_in_days: daysUntilExpiry,
      },
    })
  } catch (error) {
    console.error('API key request failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Get current valid API key
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get current valid key using the database function
    const { data, error } = await supabase.rpc('get_current_api_key', {
      p_provider: 'vnappmob',
      p_scope: 'gold',
    })

    if (error) {
      console.error('Failed to fetch current API key:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API key', details: error },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid API key found. Please request a new one.',
        hasKey: false,
      })
    }

    const keyInfo = data[0]

    return NextResponse.json({
      success: true,
      hasKey: true,
      key: {
        api_key: keyInfo.api_key,
        expires_at: keyInfo.expires_at,
        days_until_expiry: keyInfo.days_until_expiry,
        needs_refresh: keyInfo.days_until_expiry < 3, // Refresh if less than 3 days
      },
    })
  } catch (error) {
    console.error('Failed to get current API key:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
