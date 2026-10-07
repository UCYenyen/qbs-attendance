"use server"

import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { resolveLoginEmail, setMustChangePassword } from "@/lib/db/profiles"
import { homePathForRole, safeNextPath } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/server"
import { changePasswordSchema, fieldErrors, loginSchema, setPasswordSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { ChangePasswordInput } from "@/types/user"

const INVALID_LOGIN = "Email/username atau kata sandi salah."

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  // Unknown usernames get the same message as a wrong password (no account enumeration).
  const email = await resolveLoginEmail(parsed.data.identifier)
  if (!email) return { ok: false, error: INVALID_LOGIN }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password })
  if (error) return { ok: false, error: INVALID_LOGIN }

  const user = await getCurrentUser()
  if (user?.mustChangePassword) redirect("/account?first=1")

  const next = formData.get("next")
  redirect(
    safeNextPath(typeof next === "string" ? next : null, user ? homePathForRole(user.role) : "/"),
  )
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/** Used by email links (invite / recovery): the session proves identity, no current password. */
export async function setPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Link undangan sudah kedaluwarsa. Minta link baru ke admin." }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: error.message }
  await setMustChangePassword(user.id, false)

  redirect(homePathForRole(user.role))
}

/** Signed-in users change their own password; the current one is re-checked first. */
export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Sesi Anda sudah berakhir. Silakan masuk lagi." }

  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (verifyError) {
    return {
      ok: false,
      error: "Kata sandi saat ini salah.",
      fieldErrors: { currentPassword: ["Kata sandi saat ini salah"] },
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: error.message }
  await setMustChangePassword(user.id, false)

  return { ok: true, data: undefined, message: "Kata sandi berhasil diganti." }
}
