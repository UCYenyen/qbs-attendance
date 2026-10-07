import type { Metadata } from "next"
import { CalendarCheckIcon } from "lucide-react"
import { Suspense } from "react"

import { ScheduleRequestCard } from "@/components/features/schedule/schedule-request-card"
import { PageHeader } from "@/components/shared/page-header"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { listPendingRequests } from "@/lib/db/schedules"
import { getAppSettings } from "@/lib/db/settings"
import { formatInTz } from "@/lib/time"

export const metadata: Metadata = {
  title: "Pengajuan jadwal",
  description: "Review dan setujui jadwal kerja yang diajukan karyawan.",
}

async function RequestsContent() {
  await requireRole(["admin"], "/admin/schedule-requests")
  const [requests, settings] = await Promise.all([listPendingRequests(), getAppSettings()])

  if (requests.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarCheckIcon />
          </EmptyMedia>
          <EmptyTitle>Tidak ada pengajuan</EmptyTitle>
          <EmptyDescription>Semua jadwal sudah direview. Anda akan mendapat notifikasi saat ada pengajuan baru.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((request) => (
        <ScheduleRequestCard
          key={request.id}
          request={request}
          submittedLabel={formatInTz(request.createdAt, settings.timezone, "d MMM yyyy, HH:mm")}
        />
      ))}
    </div>
  )
}

export default function ScheduleRequestsPage() {
  return (
    <>
      <PageHeader
        title="Pengajuan jadwal"
        description="Karyawan tidak bisa mengubah jadwal lagi sampai pengajuannya Anda setujui atau tolak."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <RequestsContent />
      </Suspense>
    </>
  )
}
