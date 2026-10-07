import type { Enums, Tables } from "@/types/database"

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type RequestStatus = Enums<"request_status">

/** One weekday in a weekly schedule. Times are "HH:mm" (24h). */
export interface ScheduleDay {
  weekday: Weekday
  isWorkingDay: boolean
  startTime: string
  endTime: string
}

export type WeeklySchedule = ScheduleDay[]

export type ScheduleRow = Tables<"schedules">
export type ScheduleRequestRow = Tables<"schedule_requests">

/** Shape persisted in `schedule_requests.items` (snake_case, matches SQL).
 *  A type alias (not interface) so it is assignable to the `Json` column type. */
export type ScheduleItemJson = {
  weekday: number
  is_working_day: boolean
  start_time: string
  end_time: string
}

export interface ScheduleRequest {
  id: string
  userId: string
  status: RequestStatus
  items: WeeklySchedule
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface ScheduleRequestWithEmployee extends ScheduleRequest {
  employee: { id: string; fullName: string; contact: string }
  currentSchedule: WeeklySchedule | null
}

/** What the employee's schedule page needs to decide editable vs locked. */
export interface MyScheduleState {
  approved: WeeklySchedule | null
  latestRequest: ScheduleRequest | null
  isLocked: boolean
}

export interface ReviewScheduleInput {
  requestId: string
  approve: boolean
  note: string | null
}

/** A shift on one specific date (times "HH:mm"; ignored when not a working day). */
export interface Shift {
  isWorkingDay: boolean
  startTime: string | null
  endTime: string | null
}

/** Date-specific replacement of the weekly schedule (written when a swap is approved). */
export interface ScheduleOverride extends Shift {
  workDate: string
}

export interface SwapParty {
  id: string
  fullName: string
  contact: string
}

export interface ScheduleSwap {
  id: string
  workDate: string
  status: RequestStatus
  note: string | null
  reviewNote: string | null
  requester: SwapParty
  partner: SwapParty
  requesterShift: Shift
  partnerShift: Shift
  createdAt: string
}

export interface SwapPartner {
  id: string
  fullName: string
  username: string | null
}

export interface SwapPreview {
  workDate: string
  mine: Shift
  partner: Shift
}

export interface CreateSwapInput {
  partnerId: string
  workDate: string
  note: string | null
}

export interface ReviewSwapInput {
  swapId: string
  approve: boolean
  note: string | null
}
