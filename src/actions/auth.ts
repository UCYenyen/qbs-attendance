"use server"

import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { homePathForRole, safeNextPath } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/server"
import { fieldErrors, loginSchema, setPasswordSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: "Email atau kata sandi salah." }

  const user = await getCurrentUser()
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

  redirect(homePathForRole(user.role))
}
