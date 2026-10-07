import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { publicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

export interface SessionResult {
  response: NextResponse
  userId: string | null
}

/** Refreshes the auth cookies and returns the verified user id (if any). */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  // Do not run code between client creation and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims.sub === "string" ? data.claims.sub : null

  return { response, userId }
}
