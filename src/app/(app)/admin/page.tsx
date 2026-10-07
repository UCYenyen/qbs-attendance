import type { Metadata } from "next"
import { Suspense } from "react"

import { RangeToggle } from "@/components/features/dashboard/range-toggle"
import { StatsCharts } from "@/components/features/dashboard/stats-charts"
import { TodaySummaryCards } from "@/components/features/dashboard/today-summary-cards"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"
import { getAttendanceSeries, getTodaySummary, seriesTotals } from "@/lib/db/stats"
import { parseRangeKey, rangeFor } from "@/lib/date-range"
import { formatWorkDate } from "@/lib/format"
import { localNow } from "@/lib/time"

export const metadata: Metadata = {
  title: "Ringkasan",
  description: "Ringkasan kehadiran hari ini serta grafik tingkat kehadiran dan jam kerja seluruh karyawan.",
}

async function OverviewContent({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireRole(["admin"], "/admin")
  const [{ range: rangeParam }, settings] = await Promise.all([searchParams, getAppSettings()])
  const today = localNow(settings.timezone).date
  const range = rangeFor(parseRangeKey(rangeParam), today)
  const [summary, points] = await Promise.all([getTodaySummary(), getAttendanceSeries(range)])

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2>{formatWorkDate(today)}</h2>
        <TodaySummaryCards summary={summary} />
      </section>
      <StatsCharts range={range} points={points} totals={seriesTotals(points)} scopeLabel="seluruh karyawan" />
    </>
  )
}

export default function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <PageHeader
        title="Ringkasan"
        description="Kehadiran hari ini dan tren seluruh karyawan."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-72" />}>
            <RangeToggle />
          </Suspense>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <OverviewContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}
