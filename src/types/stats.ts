import type { UserRole } from "@/types/user"

export type Granularity = "day" | "week" | "month" | "year"

export type RangeKey = "daily" | "weekly" | "monthly" | "yearly"

export interface StatsRange {
  key: RangeKey
  granularity: Granularity
  from: string
  to: string
}

export interface SeriesPoint {
  bucket: string
  scheduled: number
  attended: number
  late: number
  sick: number
  excused: number
  absent: number
  attendanceRate: number | null
  workedHours: number
  avgWorkedHours: number | null
}

export interface EmployeeSummary {
  userId: string
  fullName: string
  email: string
  role: UserRole
  scheduled: number
  attended: number
  late: number
  sick: number
  excused: number
  absent: number
  attendanceRate: number | null
  workedHours: number
  hasSchedule: boolean
  hasPendingRequest: boolean
}

export interface TodaySummary {
  workDate: string
  expected: number
  checkedIn: number
  late: number
  checkedOut: number
  sick: number
  excused: number
  notPresent: number
  attendanceRate: number | null
}

export interface SeriesTotals {
  scheduled: number
  attended: number
  attendanceRate: number | null
  workedHours: number
}
