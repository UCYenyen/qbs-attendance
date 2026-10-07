import "server-only"

import { contactLabel } from "@/lib/accounts"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { shiftOn, toHourMinute } from "@/lib/time"
import type { Json } from "@/types/database"
import type {
  CreateSwapInput,
  ReviewSwapInput,
  ScheduleDay,
  ScheduleOverride,
  ScheduleSwap,
  Shift,
  SwapParty,
  SwapPartner,
  SwapPreview,
  Weekday,
} from "@/types/schedule"

interface PartyRow {
  id: string
  full_name: string
  email: string
  username: string | null
}

function toParty(row: PartyRow | null, fallbackId: string): SwapParty {
  return {
    id: row?.id ?? fallbackId,
    fullName: row?.full_name || row?.username || "Tanpa nama",
    contact: contactLabel(row?.username ?? null, row?.email ?? null),
  }
}

function shiftFromJson(value: Json | null): Shift {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { isWorkingDay: false, startTime: null, endTime: null }
  }
  const working = value.is_working_day === true
  return {
    isWorkingDay: working,
    startTime: working && typeof value.start_time === "string" ? value.start_time : null,
    endTime: working && typeof value.end_time === "string" ? value.end_time : null,
  }
}

const SWAP_SELECT =
  "*, requester:profiles!schedule_swaps_requester_id_fkey(id, full_name, email, username), partner:profiles!schedule_swaps_partner_id_fkey(id, full_name, email, username)"

/**
 * Active colleagues an employee can swap with. Read with the secret key because profiles RLS
 * only shows a user their own row; callers must be authorized active employees.
 */
export async function listSwapPartners(userId: string): Promise<SwapPartner[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, username")
    .eq("role", "active_employee")
    .neq("id", userId)
    .order("full_name")
  if (error) throw new Error(error.message)
  return data.map((row) => ({ id: row.id, fullName: row.full_name || row.username || "Tanpa nama", username: row.username }))
}

async function shiftForUser(userId: string, workDate: string): Promise<Shift> {
  const admin = createAdminClient()
  const [schedules, overrides] = await Promise.all([
    admin.from("schedules").select("weekday, is_working_day, start_time, end_time").eq("user_id", userId),
    admin
      .from("schedule_overrides")
      .select("work_date, is_working_day, start_time, end_time")
      .eq("user_id", userId)
      .eq("work_date", workDate),
  ])
  if (schedules.error) throw new Error(schedules.error.message)
  if (overrides.error) throw new Error(overrides.error.message)

  const week: ScheduleDay[] = schedules.data.map((row) => ({
    weekday: row.weekday as Weekday,
    isWorkingDay: row.is_working_day,
    startTime: toHourMinute(row.start_time),
    endTime: toHourMinute(row.end_time),
  }))
  const dayOverrides: ScheduleOverride[] = overrides.data.map((row) => ({
    workDate: row.work_date,
    isWorkingDay: row.is_working_day,
    startTime: row.is_working_day ? toHourMinute(row.start_time) : null,
    endTime: row.is_working_day ? toHourMinute(row.end_time) : null,
  }))
  return shiftOn(week, dayOverrides, workDate)
}

/** Both shifts on a date, so the employee sees what they are agreeing to. */
export async function previewSwap(userId: string, partnerId: string, workDate: string): Promise<SwapPreview> {
  const [mine, partner] = await Promise.all([shiftForUser(userId, workDate), shiftForUser(partnerId, workDate)])
  return { workDate, mine, partner }
}

/** RLS + the validate trigger enforce the rules (active partner, future date, one pending, …). */
export async function createSwap(input: CreateSwapInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("schedule_swaps")
    .insert({ partner_id: input.partnerId, work_date: input.workDate, note: input.note })
  if (error) throw new Error(error.message)
}

export async function cancelSwap(swapId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("schedule_swaps")
    .delete()
    .eq("id", swapId)
    .eq("status", "pending")
    .select("id")
  if (error) throw new Error(error.message)
  return data.length > 0
}

/** Swaps the user requested or was asked to cover (newest first). Party names via secret key. */
export async function listMySwaps(userId: string): Promise<ScheduleSwap[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("schedule_swaps")
    .select(SWAP_SELECT)
    .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
    .order("work_date", { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return data.map(toSwap)
}

export async function listPendingSwaps(): Promise<ScheduleSwap[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("schedule_swaps")
    .select(SWAP_SELECT)
    .eq("status", "pending")
    .order("work_date", { ascending: true })
  if (error) throw new Error(error.message)
  return data.map(toSwap)
}

export async function reviewSwap(input: ReviewSwapInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("review_schedule_swap", {
    p_swap_id: input.swapId,
    p_approve: input.approve,
    p_note: input.note,
  })
  if (error) throw new Error(error.message)
}

interface SwapRow {
  id: string
  work_date: string
  status: ScheduleSwap["status"]
  note: string | null
  review_note: string | null
  requester_id: string
  partner_id: string
  requester_shift: Json | null
  partner_shift: Json | null
  created_at: string
  requester: PartyRow | null
  partner: PartyRow | null
}

function toSwap(row: SwapRow): ScheduleSwap {
  return {
    id: row.id,
    workDate: row.work_date,
    status: row.status,
    note: row.note,
    reviewNote: row.review_note,
    requester: toParty(row.requester, row.requester_id),
    partner: toParty(row.partner, row.partner_id),
    requesterShift: shiftFromJson(row.requester_shift),
    partnerShift: shiftFromJson(row.partner_shift),
    createdAt: row.created_at,
  }
}
