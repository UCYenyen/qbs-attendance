import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { EmployeeSummary, SeriesPoint, SeriesTotals, StatsRange, TodaySummary } from "@/types/stats"

export async function getAttendanceSeries(
  range: StatsRange,
  userId: string | null = null,
): Promise<SeriesPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("attendance_series", {
    p_granularity: range.granularity,
    p_from: range.from,
    p_to: range.to,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)

  return data.map((row) => ({
    bucket: row.bucket,
    scheduled: row.scheduled,
    attended: row.attended,
    late: row.late,
    sick: row.sick,
    excused: row.excused,
    absent: row.absent,
    attendanceRate: row.attendance_rate === null ? null : Number(row.attendance_rate),
    workedHours: Number(row.worked_hours),
    avgWorkedHours: row.avg_worked_hours === null ? null : Number(row.avg_worked_hours),
  }))
}

export function seriesTotals(points: SeriesPoint[]): SeriesTotals {
  const scheduled = points.reduce((sum, p) => sum + p.scheduled, 0)
  const attended = points.reduce((sum, p) => sum + p.attended, 0)
  return {
    scheduled,
    attended,
    attendanceRate: scheduled === 0 ? null : Math.round((1000 * attended) / scheduled) / 10,
    workedHours: Math.round(points.reduce((sum, p) => sum + p.workedHours, 0) * 100) / 100,
  }
}

export async function getEmployeeSummaries(from: string, to: string): Promise<EmployeeSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("employee_summary", { p_from: from, p_to: to })
  if (error) throw new Error(error.message)

  return data.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name || row.email,
    email: row.email,
    role: row.role,
    scheduled: row.scheduled,
    attended: row.attended,
    late: row.late,
    sick: row.sick,
    excused: row.excused,
    absent: row.absent,
    attendanceRate: row.attendance_rate === null ? null : Number(row.attendance_rate),
    workedHours: Number(row.worked_hours),
    hasSchedule: row.has_schedule,
    hasPendingRequest: row.has_pending_request,
  }))
}

export async function getTodaySummary(): Promise<TodaySummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("today_summary", {})
  if (error) throw new Error(error.message)

  const row = data[0]
  if (!row) return null
  return {
    workDate: row.work_date,
    expected: row.expected,
    checkedIn: row.checked_in,
    late: row.late,
    checkedOut: row.checked_out,
    sick: row.sick,
    excused: row.excused,
    notPresent: row.not_present,
    attendanceRate: row.attendance_rate === null ? null : Number(row.attendance_rate),
  }
}
