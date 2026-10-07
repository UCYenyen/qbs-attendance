"use server"

import { refresh } from "next/cache"

import { authorize } from "@/lib/auth"
import { createEmployee, getProfile, isUsernameTaken, resetPassword, updateRole } from "@/lib/db/profiles"
import { createEmployeeSchema, fieldErrors, resetPasswordSchema, updateRoleSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { CreateEmployeeInput, ResetPasswordInput, UpdateRoleInput } from "@/types/user"

export async function createEmployeeAction(input: CreateEmployeeInput): Promise<ActionResult> {
  if (!(await authorize(["admin"]))) return { ok: false, error: "Hanya admin yang bisa menambah karyawan." }

  const parsed = createEmployeeSchema.safeParse({ ...input, email: input.email?.trim() || null })
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }
  if (await isUsernameTaken(parsed.data.username)) {
    return { ok: false, error: "Username sudah dipakai.", fieldErrors: { username: ["Username sudah dipakai"] } }
  }

  try {
    await createEmployee(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal membuat akun." }
  }
  refresh()
  return {
    ok: true,
    data: undefined,
    message: `Akun @${parsed.data.username} dibuat. Berikan username dan kata sandi awal ke karyawan.`,
  }
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const admin = await authorize(["admin"])
  if (!admin) return { ok: false, error: "Hanya admin yang bisa mengatur ulang kata sandi." }

  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  const target = await getProfile(parsed.data.userId)
  if (!target) return { ok: false, error: "Akun tidak ditemukan." }
  if (target.role === "admin") return { ok: false, error: "Kata sandi admin owner tidak bisa diatur ulang di sini." }

  try {
    await resetPassword(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mengatur ulang kata sandi." }
  }
  return {
    ok: true,
    data: undefined,
    message: "Kata sandi diatur ulang. Karyawan akan diminta menggantinya saat masuk.",
  }
}

export async function updateRoleAction(input: UpdateRoleInput): Promise<ActionResult> {
  const admin = await authorize(["admin"])
  if (!admin) return { ok: false, error: "Hanya admin yang bisa mengubah peran." }

  const parsed = updateRoleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Peran tidak valid." }
  if (parsed.data.userId === admin.id) return { ok: false, error: "Anda tidak bisa mengubah peran sendiri." }

  try {
    await updateRole(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mengubah peran." }
  }
  refresh()
  return { ok: true, data: undefined, message: "Peran diperbarui." }
}
