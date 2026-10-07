"use server"

import { refresh } from "next/cache"

import { authorize } from "@/lib/auth"
import { updateAppSettings } from "@/lib/db/settings"
import { appSettingsSchema, fieldErrors } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { AppSettings } from "@/types/attendance"

export async function updateSettingsAction(input: AppSettings): Promise<ActionResult> {
  if (!(await authorize(["admin"]))) return { ok: false, error: "Hanya admin yang bisa mengubah pengaturan." }

  const parsed = appSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }
  try {
    Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone })
  } catch {
    return { ok: false, error: "Zona waktu tidak dikenal.", fieldErrors: { timezone: ["Zona waktu tidak dikenal"] } }
  }

  try {
    await updateAppSettings(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan." }
  }
  refresh()
  return { ok: true, data: undefined, message: "Pengaturan disimpan." }
}
