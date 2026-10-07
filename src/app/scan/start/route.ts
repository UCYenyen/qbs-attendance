import { NextResponse, type NextRequest } from "next/server"

import { createScanPass, SCAN_PASS_COOKIE, SCAN_PASS_TTL_SECONDS, verifyQrToken } from "@/lib/qr"

/**
 * Target of the kiosk QR code. Verifies the rotating token, then hands the phone a
 * short-lived httpOnly "scan pass" so the employee has time to sign in and take a selfie.
 */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t")

  if (!token || !verifyQrToken(token)) {
    return NextResponse.redirect(new URL("/scan?error=expired", request.url))
  }

  const response = NextResponse.redirect(new URL("/scan", request.url))
  response.cookies.set(SCAN_PASS_COOKIE, createScanPass(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SCAN_PASS_TTL_SECONDS,
  })
  response.headers.set("Cache-Control", "no-store")
  return response
}
