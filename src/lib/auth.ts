import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { homePathForRole } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/server"
import type { CurrentUser, UserRole } from "@/types/user"

/** Verified current user (JWT claims checked via getClaims) + profile. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims.sub
  if (typeof userId !== "string") return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", userId)
    .maybeSingle()
  if (!profile) return null

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name || profile.email,
    role: profile.role,
    avatarUrl: profile.avatar_url,
  }
})

export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login")
  }
  return user
}

/** Redirects to the user's own home when their role isn't allowed here. */
export async function requireRole(
  roles: readonly UserRole[],
  nextPath?: string,
): Promise<CurrentUser> {
  const user = await requireUser(nextPath)
  if (!roles.includes(user.role)) redirect(homePathForRole(user.role))
  return user
}

/** For server actions: returns the user or null instead of redirecting. */
export async function authorize(roles: readonly UserRole[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser()
  return user && roles.includes(user.role) ? user : null
}
