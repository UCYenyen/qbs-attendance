import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { safeNextPath } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/server"

const OTP_TYPES: readonly EmailOtpType[] = ["invite", "magiclink", "recovery", "email", "signup", "email_change"]

function isOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.some((type) => type === value)
}

/** Handles invite / recovery email links (token_hash flow) and starts the session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = safeNextPath(searchParams.get("next"), "/")

  if (tokenHash && isOtpType(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url))
}
