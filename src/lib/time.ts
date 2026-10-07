import { TZDate } from "@date-fns/tz"
import { addDays, addMinutes, format, parseISO, subMinutes } from "date-fns"
import { id } from "date-fns/locale"

import type { AppSettings, AttendanceSession, OpenSessionResult } from "@/types/attendance"
import type { ScheduleDay, ScheduleOverride, Shift, Weekday } from "@/types/schedule"

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

/** The shift on a date: an approved swap override wins over the weekly schedule. */
export function shiftOn(
  schedule: readonly ScheduleDay[],
  overrides: readonly ScheduleOverride[],
  workDate: string,
): Shift {
  const override = overrides.find((o) => o.workDate === workDate)
  if (override) return override
  const day = schedule.find((d) => d.weekday === weekdayOf(workDate))
  return day?.isWorkingDay
    ? { isWorkingDay: true, startTime: day.startTime, endTime: day.endTime }
    : { isWorkingDay: false, startTime: null, endTime: null }
}

/**
 * Decides which session (if any) a scan right now would record.
 * Looks at yesterday too, so check-out windows that run past midnight still work.
 * `recorded` holds keys of `${workDate}:${session}` that already have a row;
 * `overrides` are approved one-day swaps for today/yesterday.
 */
export function resolveOpenSession(
  schedule: readonly ScheduleDay[],
  settings: AppSettings,
  recorded: ReadonlySet<string>,
  overrides: readonly ScheduleOverride[] = [],
  now: Date = new Date(),
): OpenSessionResult {
  const today = localNow(settings.timezone, now).date

  for (const workDate of [today, shiftDate(today, -1)]) {
    const day = shiftOn(schedule, overrides, workDate)
    if (!day.isWorkingDay || !day.startTime || !day.endTime) continue

    for (const session of SESSIONS) {
      if (recorded.has(`${workDate}:${session}`)) continue

      const time: string = session === "check_in" ? day.startTime : day.endTime
      const expected = zonedInstant(workDate, time, settings.timezone)
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

  const todayShift = shiftOn(schedule, overrides, today)
  const { startTime, endTime } = todayShift
  if (!todayShift.isWorkingDay || !startTime || !endTime) return { kind: "not_working_day", workDate: today }

  const upcoming = [startTime, endTime]
    .map((time) => subMinutes(zonedInstant(today, time, settings.timezone), settings.windowBeforeMin))
    .find((opensAt) => opensAt > now)

  return {
    kind: "no_open_window",
    workDate: today,
    nextWindow: upcoming ? upcoming.toISOString() : null,
  }
}
