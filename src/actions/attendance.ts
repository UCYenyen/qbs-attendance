"use server"

import { cookies } from "next/headers"
import { refresh } from "next/cache"

import { authorize } from "@/lib/auth"
import { assetBelongsTo } from "@/lib/cloudinary"
import { getRecordedSessions, insertScanRecord, upsertLeave } from "@/lib/db/attendance"
import { getApprovedSchedule, getOverrides } from "@/lib/db/schedules"
import { getAppSettings } from "@/lib/db/settings"
import { SCAN_PASS_COOKIE, verifyScanPass } from "@/lib/qr"
import { localNow, resolveOpenSession, shiftDate } from "@/lib/time"
import { fieldErrors, leaveSchema, recordScanSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { AttendanceSession, LeaveInput, RecordScanInput } from "@/types/attendance"

export interface RecordScanData {
  session: AttendanceSession
  isLate: boolean
}

export async function recordScanAction(
  input: RecordScanInput,
): Promise<ActionResult<RecordScanData>> {
  const user = await authorize(["active_employee"])
  if (!user) return { ok: false, error: "Hanya karyawan aktif yang bisa absen." }

  const cookieStore = await cookies()
  if (!verifyScanPass(cookieStore.get(SCAN_PASS_COOKIE)?.value)) {
    return { ok: false, error: "Scan QR sudah kedaluwarsa. Scan ulang kode di kiosk." }
  }

  const parsed = recordScanSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Ambil selfie sebelum mengirim." }

  if (!(await assetBelongsTo(parsed.data.proofPublicId, "selfie", user.id))) {
    return { ok: false, error: "Selfie tidak dapat diverifikasi. Silakan ambil ulang." }
  }

  const [schedule, settings] = await Promise.all([getApprovedSchedule(user.id), getAppSettings()])
  if (!schedule) return { ok: false, error: "Jadwal Anda belum disetujui admin." }

  const today = localNow(settings.timezone).date
  const dates = [today, shiftDate(today, -1)]
  const [recorded, overrides] = await Promise.all([
    getRecordedSessions(user.id, dates),
    getOverrides(user.id, dates),
  ])
  const open = resolveOpenSession(schedule, settings, recorded, overrides)
  if (open.kind !== "open") {
    return {
      ok: false,
      error:
        open.kind === "not_working_day"
          ? "Anda tidak dijadwalkan bekerja hari ini."
          : "Saat ini bukan waktu absen masuk atau pulang.",
    }
  }

  const result = await insertScanRecord({
    userId: user.id,
    workDate: open.workDate,
    session: open.session,
    isLate: open.isLate,
    proofPublicId: parsed.data.proofPublicId,
  })
  cookieStore.delete(SCAN_PASS_COOKIE)

  if (result === "duplicate") {
    return { ok: false, error: "Anda sudah absen untuk sesi ini." }
  }
  // No refresh(): re-rendering /scan without the (now deleted) scan pass would replace the
  // success screen with the "scan the kiosk" notice. /me fetches fresh data on navigation.
  return {
    ok: true,
    data: { session: open.session, isLate: open.isLate },
    message: open.session === "check_in" ? "Absen masuk berhasil. Selamat bekerja!" : "Absen pulang berhasil. Sampai jumpa!",
  }
}

export async function submitLeaveAction(input: LeaveInput): Promise<ActionResult> {
  const user = await authorize(["active_employee"])
  if (!user) return { ok: false, error: "Hanya karyawan aktif yang bisa mengajukan sakit/izin." }

  const parsed = leaveSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kolom yang ditandai.", fieldErrors: fieldErrors(parsed.error) }
  }

  const settings = await getAppSettings()
  const today = localNow(settings.timezone).date
  if (parsed.data.workDate < shiftDate(today, -7) || parsed.data.workDate > shiftDate(today, 30)) {
    return { ok: false, error: "Pilih tanggal dalam 7 hari terakhir atau 30 hari ke depan." }
  }

  if (
    parsed.data.proofPublicId &&
    !(await assetBelongsTo(
      parsed.data.proofPublicId,
      "document",
      user.id,
      parsed.data.proofResourceType ?? "image",
    ))
  ) {
    return { ok: false, error: "Dokumen tidak dapat diverifikasi. Silakan unggah ulang." }
  }

  try {
    const written = await upsertLeave(user.id, parsed.data)
    if (written === 0) return { ok: false, error: "Anda sudah hadir di kedua sesi pada hari itu." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal menyimpan." }
  }
  refresh()
  return { ok: true, data: undefined, message: "Tersimpan. Admin sudah bisa melihatnya." }
}
