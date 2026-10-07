import "server-only"

import { createClient } from "@supabase/supabase-js"

import { publicEnv } from "@/lib/env"
import { serverEnv } from "@/lib/env.server"
import type { Database } from "@/types/database"

/**
 * Secret-key client that bypasses RLS. Only use after the caller has been
 * authorized in server code (e.g. QR scan verified, admin role checked).
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
