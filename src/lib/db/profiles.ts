import "server-only"

import { publicEnv } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { InviteEmployeeInput, Profile, UpdateRoleInput } from "@/types/user"

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  return data
}

/** RLS + the guard trigger ensure only admins can change roles. */
export async function updateRole({ userId, role }: UpdateRoleInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)
  if (error) throw new Error(error.message)
}

export async function updateOwnName(userId: string, fullName: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId)
  if (error) throw new Error(error.message)
}

/** Sends the Supabase invite email and activates the new profile. Caller must be an admin. */
export async function inviteEmployee({ email, fullName }: InviteEmployeeInput): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/auth/set-password`,
  })
  if (error) throw new Error(error.message)

  const userId = data.user.id
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "active_employee", full_name: fullName })
    .eq("id", userId)
  if (profileError) throw new Error(profileError.message)

  return userId
}
