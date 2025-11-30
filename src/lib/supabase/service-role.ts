import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Service Role Client
 *
 * This client bypasses Row Level Security (RLS) and should only be used
 * for administrative operations on the server-side.
 *
 * NEVER expose this client to the browser or use it for user-facing operations.
 *
 * Use cases:
 * - API key management
 * - Cron jobs
 * - Admin operations
 * - Data migrations
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
