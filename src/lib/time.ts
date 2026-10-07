import { TZDate } from "@date-fns/tz"
import { addDays, addMinutes, format, parseISO, subMinutes } from "date-fns"
import { id } from "date-fns/locale"

import type { AppSettings, AttendanceSession, OpenSessionResult } from "@/types/attendance"
import type { ScheduleDay, Weekday } from "@/types/schedule"

export const DEFAULT_TIMEZONE = "Asia/Jakarta"

export interface LocalNow {
  /** yyyy-MM-dd in the app timezone */
  date: string
  /** HH:mm in the app timezone */
  time: string
  weekday: Weekday
}

export function localNow(timezone: string, now: Date = new Date()): LocalNow {
  const zoned = new TZDate(now, timezone)
  return {
    date: format(zoned, "yyyy-MM-dd"),
    time: format(zoned, "HH:mm"),
    weekday: zoned.getDay() as Weekday,
  }
}

/** Weekday (0 = Sunday) of a yyyy-MM-dd calendar date. */
export function weekdayOf(workDate: string): Weekday {
  return parseISO(workDate).getDay() as Weekday
}

export function shiftDate(workDate: string, days: number): string {
  return format(addDays(parseISO(workDate), days), "yyyy-MM-dd")
}

/** The real instant for a local calendar date + "HH:mm" time in `timezone`. */
export function zonedInstant(workDate: string, time: string, timezone: string): Date {
  const [year, month, day] = workDate.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  return new Date(new TZDate(year, month - 1, day, hours, minutes, timezone).getTime())
}

/** Postgres `time` values arrive as "HH:mm:ss"; normalise to "HH:mm". */
export function toHourMinute(time: string): string {
  return time.slice(0, 5)
}

export function formatInTz(iso: string | Date, timezone: string, pattern: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso
  return format(new TZDate(date, timezone), pattern, { locale: id })
}

const SESSIONS: AttendanceSession[] = ["check_in", "check_out"]

/**
 * Decides which session (if any) a scan right now would record.
 * Looks at yesterday too, so check-out windows that run past midnight still work.
 * `recorded` holds keys of `${workDate}:${session}` that already have a row.
 */
export function resolveOpenSession(
  schedule: ScheduleDay[],
  settings: AppSettings,
  recorded: ReadonlySet<string>,
  now: Date = new Date(),
): OpenSessionResult {
  const today = localNow(settings.timezone, now).date

  for (const workDate of [today, shiftDate(today, -1)]) {
    const day = schedule.find((d) => d.weekday === weekdayOf(workDate))
    if (!day?.isWorkingDay) continue

    for (const session of SESSIONS) {
      if (recorded.has(`${workDate}:${session}`)) continue

      const expected = zonedInstant(
        workDate,
        session === "check_in" ? day.startTime : day.endTime,
        settings.timezone,
      )
      const opensAt = subMinutes(expected, settings.windowBeforeMin)
      const closesAt = addMinutes(expected, settings.windowAfterMin)

      if (now >= opensAt && now <= closesAt) {
        return {
          kind: "open",
          session,
          workDate,
          expectedAt: expected.toISOString(),
          isLate:
            session === "check_in" && now > addMinutes(expected, settings.lateGraceMinutes),
        }
      }
    }
  }

  const todaySchedule = schedule.find((d) => d.weekday === weekdayOf(today))
  if (!todaySchedule?.isWorkingDay) return { kind: "not_working_day", workDate: today }

  const upcoming = SESSIONS.map((session) =>
    subMinutes(
      zonedInstant(
        today,
        session === "check_in" ? todaySchedule.startTime : todaySchedule.endTime,
        settings.timezone,
      ),
      settings.windowBeforeMin,
    ),
  ).find((opensAt) => opensAt > now)

  return {
    kind: "no_open_window",
    workDate: today,
    nextWindow: upcoming ? upcoming.toISOString() : null,
  }
}
