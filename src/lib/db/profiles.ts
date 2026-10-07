import "server-only"

import { placeholderEmailFor } from "@/lib/accounts"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { CreateEmployeeInput, Profile, ResetPasswordInput, UpdateRoleInput } from "@/types/user"

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

/**
 * Resolves what the user typed on the login form to an auth email.
 * Anything with "@" is treated as an email; otherwise it is looked up as a username.
 */
export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim().toLowerCase()
  if (value.includes("@")) return value

  const admin = createAdminClient()
  const { data } = await admin.from("profiles").select("email").eq("username", value).maybeSingle()
  return data?.email ?? null
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const admin = createAdminClient()
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("username", username)
  return (count ?? 0) > 0
}

/**
 * Creates an active employee with an owner-chosen default password (no email is sent).
 * The employee is asked to change the password after signing in. Caller must be an admin.
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email ?? placeholderEmailFor(input.username),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  })
  if (error) {
    if (error.code === "email_exists") throw new Error("Email sudah dipakai akun lain.")
    throw new Error(error.message)
  }

  const userId = data.user.id
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: "active_employee",
      full_name: input.fullName,
      username: input.username,
      must_change_password: true,
    })
    .eq("id", userId)

  if (profileError) {
    // Keep auth and profiles consistent: undo the half-created account.
    await admin.auth.admin.deleteUser(userId)
    if (profileError.code === "23505") throw new Error("Username sudah dipakai.")
    throw new Error(profileError.message)
  }
  return userId
}

/** Owner sets a new default password; the employee must change it again after signing in. */
export async function resetPassword({ userId, password }: ResetPasswordInput): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) throw new Error(error.message)
  await admin.from("profiles").update({ must_change_password: true }).eq("id", userId)
}

export async function setMustChangePassword(userId: string, value: boolean): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ must_change_password: value }).eq("id", userId)
  if (error) throw new Error(error.message)
}
