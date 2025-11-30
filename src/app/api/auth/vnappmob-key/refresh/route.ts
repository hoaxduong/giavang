import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

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
 * Proactive API Key Refresh Endpoint
 *
 * This endpoint should be called by a cron job daily to check and refresh
 * API keys that are expiring soon (< 5 days remaining)
 *
 * Vercel Cron: Run once daily
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (only cron jobs can trigger this)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Check current API key status
    const { data: keyData, error: keyError } = await supabase.rpc(
      'get_current_api_key',
      {
        p_provider: 'vnappmob',
        p_scope: 'gold',
      }
    )

    if (keyError) {
      console.error('Failed to check API key status:', keyError)
      return NextResponse.json(
        { error: 'Failed to check key status', details: keyError },
        { status: 500 }
      )
    }

    // If no key exists or key is expiring soon, request new one
    const shouldRefresh =
      !keyData ||
      keyData.length === 0 ||
      (keyData[0] && keyData[0].days_until_expiry < 5)

    if (!shouldRefresh) {
      const currentKey = keyData[0]
      return NextResponse.json({
        success: true,
        action: 'no_refresh_needed',
        message: 'API key is still valid',
        days_until_expiry: currentKey.days_until_expiry,
        expires_at: currentKey.expires_at,
      })
    }

    // Request new API key
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
      console.error('Failed to request new API key:', keyResponse.status)
      return NextResponse.json(
        {
          error: 'Failed to request new API key',
          status: keyResponse.status,
        },
        { status: 502 }
      )
    }

    const keyResponseData: VnappmobKeyResponse = await keyResponse.json()

    if (!keyResponseData.results) {
      console.error('No API key in response:', keyResponseData)
      return NextResponse.json(
        { error: 'Invalid API key response', details: keyResponseData },
        { status: 502 }
      )
    }

    // The API key is a JWT token in the 'results' field
    const apiKey = keyResponseData.results

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

    // Store new key in database
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        provider: 'vnappmob',
        scope: 'gold',
        api_key: apiKey,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        notes: `Auto-refreshed by cron job on ${new Date().toISOString()}. JWT issued at ${issuedAt.toISOString()}`,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store new API key:', insertError)
      return NextResponse.json(
        { error: 'Failed to store new key', details: insertError },
        { status: 500 }
      )
    }

    // Get info about old key
    const oldKeyInfo = keyData && keyData.length > 0 ? keyData[0] : null

    return NextResponse.json({
      success: true,
      action: 'refreshed',
      message: 'API key refreshed successfully',
      old_key: oldKeyInfo
        ? {
            expires_at: oldKeyInfo.expires_at,
            days_remaining: oldKeyInfo.days_until_expiry,
          }
        : null,
      new_key: {
        id: newKey.id,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        expires_in_days: daysUntilExpiry,
      },
    })
  } catch (error) {
    console.error('API key refresh failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
