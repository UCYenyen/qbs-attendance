import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { publicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/** Per-request Supabase client acting as the signed-in user (RLS applies). */
export async function createClient() {
  // supabase-js reads the clock (Date.now) while loading the session. With Cache Components that
  // must happen at request time, so opt out of prerendering before touching auth.
  await connection()
  const cookieStore = await cookies()

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  })
}
