import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

const PROTECTED_PREFIXES = ["/admin", "/me", "/account", "/kiosk", "/inactive", "/auth/set-password"]

function isProtected(pathname: string): boolean {
  if (pathname === "/scan") return true // /scan/start stays public: it sets the scan pass first
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Redirect that keeps any auth cookies refreshed during this request. */
function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

/**
 * Refreshes the Supabase session on every request and does an optimistic
 * signed-in check. Role checks happen in server code (lib/auth) and RLS.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request)
  const { pathname, search } = request.nextUrl

  if (!userId && isProtected(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return redirectWithCookies(url, response)
  }

  if (userId && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return redirectWithCookies(url, response)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
