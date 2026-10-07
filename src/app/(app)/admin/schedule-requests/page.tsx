import type { Metadata } from "next"
import { ArrowLeftRightIcon, CalendarCheckIcon } from "lucide-react"
import { Suspense } from "react"

import { ScheduleRequestCard } from "@/components/features/schedule/schedule-request-card"
import { SwapReviewCard } from "@/components/features/swaps/swap-review-card"
import { PageHeader } from "@/components/shared/page-header"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { listPendingRequests } from "@/lib/db/schedules"
import { getAppSettings } from "@/lib/db/settings"
import { listPendingSwaps } from "@/lib/db/swaps"
import { formatWorkDate } from "@/lib/format"
import { formatInTz } from "@/lib/time"

export const metadata: Metadata = {
  title: "Pengajuan jadwal",
  description: "Review jadwal mingguan dan tukar jadwal yang diajukan karyawan.",
}

function NothingPending({ title, icon: Icon }: { title: string; icon: typeof CalendarCheckIcon }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>Anda akan mendapat notifikasi saat ada pengajuan baru.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

async function RequestsContent() {
  await requireRole(["admin"], "/admin/schedule-requests")
  const [requests, swaps, settings] = await Promise.all([listPendingRequests(), listPendingSwaps(), getAppSettings()])
  const submitted = (iso: string) => formatInTz(iso, settings.timezone, "d MMM yyyy, HH:mm")

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2>Tukar jadwal ({swaps.length})</h2>
        <p className="text-muted-foreground">
          Hanya berlaku untuk tanggal tersebut. Tanpa persetujuan Anda, jadwal tidak berubah.
        </p>
        {swaps.length === 0 ? (
          <NothingPending title="Tidak ada pengajuan tukar jadwal" icon={ArrowLeftRightIcon} />
        ) : (
          swaps.map((swap) => (
            <SwapReviewCard
              key={swap.id}
              swap={swap}
              dateLabel={formatWorkDate(swap.workDate)}
              submittedLabel={submitted(swap.createdAt)}
            />
          ))
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2>Jadwal mingguan ({requests.length})</h2>
        <p className="text-muted-foreground">
          Karyawan tidak bisa mengubah jadwal lagi sampai pengajuannya Anda setujui atau tolak.
        </p>
        {requests.length === 0 ? (
          <NothingPending title="Tidak ada pengajuan jadwal mingguan" icon={CalendarCheckIcon} />
        ) : (
          requests.map((request) => (
            <ScheduleRequestCard key={request.id} request={request} submittedLabel={submitted(request.createdAt)} />
          ))
        )}
      </section>
    </>
  )
}

export default function ScheduleRequestsPage() {
  return (
    <>
      <PageHeader title="Pengajuan jadwal" description="Tukar jadwal per hari dan perubahan jadwal mingguan." />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <RequestsContent />
      </Suspense>
    </>
  )
}
