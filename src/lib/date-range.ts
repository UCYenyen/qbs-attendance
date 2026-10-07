import { id } from "date-fns/locale"
import { format, parseISO, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks, subYears } from "date-fns"

import type { Granularity, RangeKey, StatsRange } from "@/types/stats"

export const RANGE_KEYS: readonly RangeKey[] = ["daily", "weekly", "monthly", "yearly"]

export const RANGE_LABELS: Record<RangeKey, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
}

const GRANULARITY: Record<RangeKey, Granularity> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
}

export function parseRangeKey(value: string | string[] | undefined): RangeKey {
  const raw = Array.isArray(value) ? value[0] : value
  return RANGE_KEYS.find((key) => key === raw) ?? "daily"
}

/** Window shown for each range: 30 days, 12 weeks, 12 months, 5 years (ending today). */
export function rangeFor(key: RangeKey, today: string): StatsRange {
  const end = parseISO(today)
  const startByKey: Record<RangeKey, Date> = {
    daily: subDays(end, 29),
    // Postgres date_trunc('week') starts on Monday.
    weekly: startOfWeek(subWeeks(end, 11), { weekStartsOn: 1 }),
    monthly: startOfMonth(subMonths(end, 11)),
    yearly: startOfYear(subYears(end, 4)),
  }

  return {
    key,
    granularity: GRANULARITY[key],
    from: format(startByKey[key], "yyyy-MM-dd"),
    to: today,
  }
}

export function formatBucket(bucket: string, granularity: Granularity): string {
  const date = parseISO(bucket)
  switch (granularity) {
    case "day":
      return format(date, "d MMM", { locale: id })
    case "week":
      return `Mg ${format(date, "d MMM", { locale: id })}`
    case "month":
      return format(date, "MMM yy", { locale: id })
    case "year":
      return format(date, "yyyy")
  }
}
