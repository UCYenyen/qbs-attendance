"use server"

import { refresh } from "next/cache"

import { authorize } from "@/lib/auth"
import { createScheduleRequest, reviewScheduleRequest } from "@/lib/db/schedules"
import { fieldErrors, reviewScheduleSchema, weeklyScheduleSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { ReviewScheduleInput, WeeklySchedule } from "@/types/schedule"

/** Submitting locks the schedule until an admin reviews it (enforced by a DB unique index). */
export async function submitScheduleAction(schedule: WeeklySchedule): Promise<ActionResult> {
  if (!(await authorize(["active_employee"]))) {
    return { ok: false, error: "Hanya karyawan aktif yang bisa mengajukan jadwal." }
  }

  const parsed = weeklyScheduleSchema.safeParse(schedule)
  if (!parsed.success) {
    return { ok: false, error: "Periksa hari yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  try {
    await createScheduleRequest(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal menyimpan jadwal." }
  }
  refresh()
  return { ok: true, data: undefined, message: "Jadwal dikirim ke admin untuk direview." }
}

export async function reviewScheduleAction(input: ReviewScheduleInput): Promise<ActionResult> {
  if (!(await authorize(["admin"]))) return { ok: false, error: "Hanya admin yang bisa mereview jadwal." }

  const parsed = reviewScheduleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Review tidak valid." }

  try {
    await reviewScheduleRequest(parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mereview jadwal." }
  }
  refresh()
  return {
    ok: true,
    data: undefined,
    message: parsed.data.approve ? "Jadwal disetujui." : "Jadwal ditolak.",
  }
}
