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
  employee: { id: string; fullName: string; email: string }
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
