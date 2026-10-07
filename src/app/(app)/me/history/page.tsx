import type { Metadata } from "next"
import { Suspense } from "react"

import { AttendanceLogTable } from "@/components/features/attendance/attendance-log-table"
import { RangeToggle } from "@/components/features/dashboard/range-toggle"
import { StatsCharts } from "@/components/features/dashboard/stats-charts"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAttendanceLog } from "@/lib/db/attendance"
import { getAppSettings } from "@/lib/db/settings"
import { getAttendanceSeries, seriesTotals } from "@/lib/db/stats"
import { parseRangeKey, rangeFor } from "@/lib/date-range"
import { localNow, shiftDate } from "@/lib/time"

export const metadata: Metadata = {
  title: "Riwayat",
  description: "Grafik tingkat kehadiran, jam kerja, dan riwayat absensi Anda.",
}

async function HistoryContent({ searchParams }: { searchParams: PageProps<"/me/history">["searchParams"] }) {
  const user = await requireRole(["active_employee", "inactive_employee"], "/me/history")
  const [{ range: rangeParam }, settings] = await Promise.all([searchParams, getAppSettings()])
  const today = localNow(settings.timezone).date
  const range = rangeFor(parseRangeKey(rangeParam), today)
  const [points, log] = await Promise.all([
    getAttendanceSeries(range, user.id),
    getAttendanceLog(user.id, shiftDate(today, -60), today),
  ])

  return (
    <>
      <StatsCharts range={range} points={points} totals={seriesTotals(points)} scopeLabel="saya" />
      <section className="flex flex-col gap-3">
        <h2>Riwayat 60 hari terakhir</h2>
        <AttendanceLogTable days={log} timezone={settings.timezone} />
      </section>
    </>
  )
}

export default function HistoryPage({ searchParams }: PageProps<"/me/history">) {
  return (
    <>
      <PageHeader
        title="Riwayat"
        description="Tingkat kehadiran dan jam kerja Anda."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-72" />}>
            <RangeToggle />
          </Suspense>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}
