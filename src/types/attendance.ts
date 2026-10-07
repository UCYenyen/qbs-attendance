import type { Enums, Tables, Views } from "@/types/database"

export type AttendanceStatus = Enums<"attendance_status">
export type AttendanceSession = Enums<"attendance_session">

export type AttendanceRecord = Tables<"attendance">
export type AttendanceDayRow = Views<"attendance_days">

export type ProofResourceType = "image" | "raw" | "video"

/** One employee-day, as shown in attendance logs. */
export interface AttendanceDay {
  workDate: string
  status: AttendanceStatus
  isLate: boolean
  checkInAt: string | null
  checkOutAt: string | null
  workedHours: number | null
  note: string | null
  proofs: AttendanceProof[]
}

export interface AttendanceProof {
  session: AttendanceSession
  publicId: string
  resourceType: ProofResourceType
  /** Short-lived signed delivery URL (server-generated). */
  url: string
}

/** Scan-window configuration, mirrors `app_settings`. */
export interface AppSettings {
  timezone: string
  lateGraceMinutes: number
  windowBeforeMin: number
  windowAfterMin: number
}

export type OpenSessionResult =
  | {
      kind: "open"
      session: AttendanceSession
      workDate: string
      expectedAt: string
      isLate: boolean
    }
  | { kind: "not_working_day"; workDate: string }
  | { kind: "no_open_window"; workDate: string; nextWindow: string | null }

export type LeaveStatus = Extract<AttendanceStatus, "sick" | "excused">

export interface LeaveInput {
  status: LeaveStatus
  workDate: string
  note: string
  proofPublicId: string | null
  proofResourceType: ProofResourceType | null
}

export interface RecordScanInput {
  proofPublicId: string
}

export interface TodayStatus {
  workDate: string
  checkIn: AttendanceRecord | null
  checkOut: AttendanceRecord | null
}
