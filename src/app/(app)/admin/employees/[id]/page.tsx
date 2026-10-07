import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AttendanceLogTable } from "@/components/features/attendance/attendance-log-table"
import { RangeToggle } from "@/components/features/dashboard/range-toggle"
import { StatsCharts } from "@/components/features/dashboard/stats-charts"
import { ResetPasswordDialog } from "@/components/features/employees/reset-password-dialog"
import { ScheduleSummary } from "@/components/features/schedule/schedule-summary"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAttendanceLog } from "@/lib/db/attendance"
import { getProfile } from "@/lib/db/profiles"
import { getApprovedSchedule } from "@/lib/db/schedules"
import { getAppSettings } from "@/lib/db/settings"
import { getAttendanceSeries, seriesTotals } from "@/lib/db/stats"
import { parseRangeKey, rangeFor } from "@/lib/date-range"
import { contactLabel } from "@/lib/accounts"
import { ROLE_LABELS } from "@/lib/format"
import { localNow, shiftDate } from "@/lib/time"

export const metadata: Metadata = {
  title: "Detail karyawan",
  description: "Jadwal, tingkat kehadiran, jam kerja, dan riwayat absensi karyawan.",
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function EmployeeDetail({ params, searchParams }: PageProps<"/admin/employees/[id]">) {
  await requireRole(["admin"], "/admin/employees")
  const [{ id }, { range: rangeParam }, settings] = await Promise.all([params, searchParams, getAppSettings()])
  if (!UUID.test(id)) notFound()

  const profile = await getProfile(id)
  if (!profile || profile.role === "admin" || profile.role === "admin_qr") notFound()

  const today = localNow(settings.timezone).date
  const range = rangeFor(parseRangeKey(rangeParam), today)
  const [schedule, points, log] = await Promise.all([
    getApprovedSchedule(id),
    getAttendanceSeries(range, id),
    getAttendanceLog(id, shiftDate(today, -30), today),
  ])

  return (
    <>
      <PageHeader
        title={profile.full_name || profile.username || profile.email}
        description={contactLabel(profile.username, profile.email)}
        actions={
          <>
            <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            <ResetPasswordDialog userId={profile.id} name={profile.full_name || profile.username || "karyawan ini"} />
            <Suspense fallback={<Skeleton className="h-9 w-72" />}>
              <RangeToggle />
            </Suspense>
          </>
        }
      />
      <StatsCharts range={range} points={points} totals={seriesTotals(points)} scopeLabel="" />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Jadwal kerja</CardTitle>
            <CardDescription>Jadwal yang sudah disetujui.</CardDescription>
          </CardHeader>
          <CardContent>
            {schedule ? (
              <ScheduleSummary schedule={schedule} />
            ) : (
              <p className="text-muted-foreground">Belum ada jadwal yang disetujui.</p>
            )}
          </CardContent>
        </Card>
        <section className="flex min-w-0 flex-col gap-3">
          <h2>Riwayat 30 hari terakhir</h2>
          <AttendanceLogTable days={log} timezone={settings.timezone} />
        </section>
      </div>
    </>
  )
}

export default function EmployeeDetailPage(props: PageProps<"/admin/employees/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EmployeeDetail {...props} />
    </Suspense>
  )
}
