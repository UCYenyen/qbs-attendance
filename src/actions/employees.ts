"use server"

import { refresh } from "next/cache"

import { authorize } from "@/lib/auth"
import { inviteEmployee, updateRole } from "@/lib/db/profiles"
import { fieldErrors, inviteEmployeeSchema, updateRoleSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { InviteEmployeeInput, UpdateRoleInput } from "@/types/user"

export async function inviteEmployeeAction(input: InviteEmployeeInput): Promise<ActionResult> {
  if (!(await authorize(["admin"]))) return { ok: false, error: "Hanya admin yang bisa mengundang karyawan." }

  const parsed = inviteEmployeeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  try {
    await inviteEmployee(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mengirim undangan." }
  }
  refresh()
  return { ok: true, data: undefined, message: `Undangan terkirim ke ${parsed.data.email}.` }
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
