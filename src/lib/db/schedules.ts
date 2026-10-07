import "server-only"

import { createClient } from "@/lib/supabase/server"
import { toHourMinute } from "@/lib/time"
import type { Json } from "@/types/database"
import type {
  MyScheduleState,
  ReviewScheduleInput,
  ScheduleItemJson,
  ScheduleRequest,
  ScheduleRequestRow,
  ScheduleRequestWithEmployee,
  ScheduleRow,
  Weekday,
  WeeklySchedule,
} from "@/types/schedule"

function isWeekday(value: number): value is Weekday {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

function fromRows(rows: ScheduleRow[]): WeeklySchedule | null {
  if (rows.length === 0) return null
  return rows
    .filter((row) => isWeekday(row.weekday))
    .map((row) => ({
      weekday: row.weekday as Weekday,
      isWorkingDay: row.is_working_day,
      startTime: toHourMinute(row.start_time),
      endTime: toHourMinute(row.end_time),
    }))
    .sort((a, b) => a.weekday - b.weekday)
}

function isScheduleItem(value: Json): value is Json & ScheduleItemJson {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.weekday === "number" &&
    typeof value.is_working_day === "boolean" &&
    typeof value.start_time === "string" &&
    typeof value.end_time === "string"
  )
}

function itemsFromJson(items: Json): WeeklySchedule {
  if (!Array.isArray(items)) return []
  return items
    .filter(isScheduleItem)
    .filter((item) => isWeekday(item.weekday))
    .map((item) => ({
      weekday: item.weekday as Weekday,
      isWorkingDay: item.is_working_day,
      startTime: toHourMinute(item.start_time),
      endTime: toHourMinute(item.end_time),
    }))
    .sort((a, b) => a.weekday - b.weekday)
}

function toRequest(row: ScheduleRequestRow): ScheduleRequest {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    items: itemsFromJson(row.items),
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }
}

export async function getApprovedSchedule(userId: string): Promise<WeeklySchedule | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("schedules").select("*").eq("user_id", userId)
  if (error) throw new Error(error.message)
  return fromRows(data)
}

export async function getMyScheduleState(userId: string): Promise<MyScheduleState> {
  const supabase = await createClient()
  const [approved, latest] = await Promise.all([
    getApprovedSchedule(userId),
    supabase
      .from("schedule_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (latest.error) throw new Error(latest.error.message)

  const latestRequest = latest.data ? toRequest(latest.data) : null
  return { approved, latestRequest, isLocked: latestRequest?.status === "pending" }
}

/** Fails with a unique violation if a pending request already exists (the lock). */
export async function createScheduleRequest(schedule: WeeklySchedule): Promise<ScheduleRequest> {
  const supabase = await createClient()
  const items: ScheduleItemJson[] = schedule.map((day) => ({
    weekday: day.weekday,
    is_working_day: day.isWorkingDay,
    start_time: day.startTime,
    end_time: day.endTime,
  }))

  const { data, error } = await supabase
    .from("schedule_requests")
    .insert({ items })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("Anda masih punya jadwal yang menunggu review.")
    throw new Error(error.message)
  }
  return toRequest(data)
}

export async function listPendingRequests(): Promise<ScheduleRequestWithEmployee[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("schedule_requests")
    .select("*, employee:profiles!schedule_requests_user_id_fkey(id, full_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)

  const userIds = data.map((row) => row.user_id)
  const { data: scheduleRows, error: scheduleError } = userIds.length
    ? await supabase.from("schedules").select("*").in("user_id", userIds)
    : { data: [] as ScheduleRow[], error: null }
  if (scheduleError) throw new Error(scheduleError.message)

  return data.map((row) => ({
    ...toRequest(row),
    employee: {
      id: row.employee?.id ?? row.user_id,
      fullName: row.employee?.full_name || row.employee?.email || "Tanpa nama",
      email: row.employee?.email ?? "",
    },
    currentSchedule: fromRows(scheduleRows.filter((s) => s.user_id === row.user_id)),
  }))
}

export async function countPendingRequests(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("schedule_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function reviewScheduleRequest(input: ReviewScheduleInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("review_schedule_request", {
    p_request_id: input.requestId,
    p_approve: input.approve,
    p_note: input.note,
  })
  if (error) throw new Error(error.message)
}
