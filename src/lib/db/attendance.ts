import "server-only"

import { signedAssetUrl } from "@/lib/cloudinary"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type {
  AttendanceDay,
  AttendanceProof,
  AttendanceRecord,
  AttendanceSession,
  LeaveInput,
  ProofResourceType,
  TodayStatus,
} from "@/types/attendance"

function asResourceType(value: string | null): ProofResourceType {
  return value === "raw" || value === "video" ? value : "image"
}

/** Keys of `${workDate}:${session}` that already have a row (used to pick the open session). */
export async function getRecordedSessions(userId: string, dates: string[]): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("work_date, session")
    .eq("user_id", userId)
    .in("work_date", dates)
  if (error) throw new Error(error.message)
  return new Set(data.map((row) => `${row.work_date}:${row.session}`))
}

export async function getTodayStatus(userId: string, workDate: string): Promise<TodayStatus> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("work_date", workDate)
  if (error) throw new Error(error.message)

  const bySession = (session: AttendanceSession): AttendanceRecord | null =>
    data.find((row) => row.session === session) ?? null

  return { workDate, checkIn: bySession("check_in"), checkOut: bySession("check_out") }
}

export interface ScanRecordInput {
  userId: string
  workDate: string
  session: AttendanceSession
  isLate: boolean
  proofPublicId: string
}

/**
 * Inserts a verified scan. Runs with the secret key because clients may not write
 * attendance directly; the caller must have validated the QR pass and window.
 */
export async function insertScanRecord(input: ScanRecordInput): Promise<"created" | "duplicate"> {
  const admin = createAdminClient()
  const { error } = await admin.from("attendance").insert({
    user_id: input.userId,
    work_date: input.workDate,
    session: input.session,
    status: "attend",
    is_late: input.isLate,
    proof_of_attendance: input.proofPublicId,
    proof_resource_type: "image",
  })
  if (!error) return "created"
  if (error.code === "23505") return "duplicate"
  throw new Error(error.message)
}

/**
 * Records sick/excused for both sessions of a day. Sessions already attended are kept;
 * `absence` rows written by the cron are replaced.
 */
export async function upsertLeave(userId: string, input: LeaveInput): Promise<number> {
  const admin = createAdminClient()
  const { data: existing, error } = await admin
    .from("attendance")
    .select("session, status")
    .eq("user_id", userId)
    .eq("work_date", input.workDate)
  if (error) throw new Error(error.message)

  const attended = new Set(
    existing.filter((row) => row.status === "attend").map((row) => row.session),
  )
  const sessions = (["check_in", "check_out"] as const).filter((s) => !attended.has(s))
  if (sessions.length === 0) return 0

  const { error: upsertError } = await admin.from("attendance").upsert(
    sessions.map((session) => ({
      user_id: userId,
      work_date: input.workDate,
      session,
      status: input.status,
      is_late: false,
      note: input.note,
      proof_of_attendance: input.proofPublicId,
      proof_resource_type: input.proofResourceType,
    })),
    { onConflict: "user_id,work_date,session" },
  )
  if (upsertError) throw new Error(upsertError.message)
  return sessions.length
}

/** Day-level log with signed proof URLs, newest first. */
export async function getAttendanceLog(
  userId: string,
  from: string,
  to: string,
): Promise<AttendanceDay[]> {
  const supabase = await createClient()
  const [days, rows] = await Promise.all([
    supabase
      .from("attendance_days")
      .select("*")
      .eq("user_id", userId)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false }),
    supabase
      .from("attendance")
      .select("work_date, session, note, proof_of_attendance, proof_resource_type")
      .eq("user_id", userId)
      .gte("work_date", from)
      .lte("work_date", to),
  ])
  if (days.error) throw new Error(days.error.message)
  if (rows.error) throw new Error(rows.error.message)

  return days.data.flatMap((day) => {
    if (!day.work_date || !day.status) return []
    const dayRows = rows.data.filter((row) => row.work_date === day.work_date)
    const seen = new Set<string>()
    const proofs: AttendanceProof[] = dayRows.flatMap((row) => {
      if (!row.proof_of_attendance || seen.has(row.proof_of_attendance)) return []
      seen.add(row.proof_of_attendance)
      const resourceType = asResourceType(row.proof_resource_type)
      return [
        {
          session: row.session,
          publicId: row.proof_of_attendance,
          resourceType,
          url: signedAssetUrl(row.proof_of_attendance, resourceType),
        },
      ]
    })

    return [
      {
        workDate: day.work_date,
        status: day.status,
        isLate: day.is_late ?? false,
        checkInAt: day.check_in_at,
        checkOutAt: day.check_out_at,
        workedHours: day.worked_hours,
        note: dayRows.find((row) => row.note)?.note ?? null,
        proofs,
      },
    ]
  })
}
