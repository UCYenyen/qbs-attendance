import type { Metadata } from "next"
import { Suspense } from "react"

import { ScheduleForm } from "@/components/features/schedule/schedule-form"
import { ScheduleSummary } from "@/components/features/schedule/schedule-summary"
import { PageHeader } from "@/components/shared/page-header"
import { RequestStatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getMyScheduleState } from "@/lib/db/schedules"
import type { WeeklySchedule } from "@/types/schedule"

export const metadata: Metadata = {
  title: "Jadwal saya",
  description: "Atur jam kerja mingguan Anda dan ajukan ke admin untuk disetujui.",
}

const DEFAULT_SCHEDULE: WeeklySchedule = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday: weekday as WeeklySchedule[number]["weekday"],
  isWorkingDay: weekday >= 1 && weekday <= 5,
  startTime: "08:00",
  endTime: "21:00",
}))

async function ScheduleContent() {
  const user = await requireRole(["active_employee"], "/me/schedule")
  const state = await getMyScheduleState(user.id)
  const initial =
    state.latestRequest?.status === "pending"
      ? state.latestRequest.items
      : (state.approved ?? state.latestRequest?.items ?? DEFAULT_SCHEDULE)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <ScheduleForm
        initial={initial.length === 7 ? initial : DEFAULT_SCHEDULE}
        isLocked={state.isLocked}
        rejectionNote={state.latestRequest?.status === "rejected" ? (state.latestRequest.reviewNote ?? "Tanpa catatan.") : null}
      />
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Jadwal yang berlaku</CardTitle>
          <CardDescription className="flex items-center gap-2">
            Status pengajuan terakhir:
            {state.latestRequest ? <RequestStatusBadge status={state.latestRequest.status} /> : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.approved ? (
            <ScheduleSummary schedule={state.approved} />
          ) : (
            <p className="text-muted-foreground">Belum ada jadwal yang disetujui.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function MySchedulePage() {
  return (
    <>
      <PageHeader
        title="Jadwal saya"
        description="Isi jam masuk dan pulang untuk setiap hari. Setelah disimpan, admin perlu menyetujuinya, dan jadwal tidak bisa diubah sampai direview."
      />
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
        <ScheduleContent />
      </Suspense>
    </>
  )
}
