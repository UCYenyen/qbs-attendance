import { format, parseISO } from "date-fns"
import { id } from "date-fns/locale"


import type { AttendanceStatus } from "@/types/attendance"
import type { RequestStatus, Weekday } from "@/types/schedule"
import type { UserRole } from "@/types/user"

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
}

/** Urutan tampilan mulai Senin. */
export const WEEKDAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin (owner)",
  admin_qr: "Admin QR",
  active_employee: "Karyawan aktif",
  inactive_employee: "Karyawan nonaktif",
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  attend: "Hadir",
  sick: "Sakit",
  excused: "Izin",
  absence: "Alpa",
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

export function formatHours(value: number | null): string {
  if (value === null) return "—"
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return minutes === 0 ? `${hours} j` : `${hours} j ${minutes} m`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}

/** "Senin, 7 Okt 2026" style date for a yyyy-MM-dd calendar date. */
export function formatWorkDate(workDate: string, pattern = "EEEE, d MMM yyyy"): string {
  return format(parseISO(workDate), pattern, { locale: id })
}
