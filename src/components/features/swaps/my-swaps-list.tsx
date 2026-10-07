import { ArrowLeftRightIcon } from "lucide-react"

import { CancelSwapButton } from "@/components/features/swaps/cancel-swap-button"
import { RequestStatusBadge } from "@/components/shared/status-badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatShift, formatWorkDate } from "@/lib/format"
import type { ScheduleSwap } from "@/types/schedule"

export function MySwapsList({ swaps, userId }: { swaps: ScheduleSwap[]; userId: string }) {
  if (swaps.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ArrowLeftRightIcon />
          </EmptyMedia>
          <EmptyTitle>Belum ada tukar jadwal</EmptyTitle>
          <EmptyDescription>Pengajuan Anda dan pengajuan rekan yang melibatkan Anda akan tampil di sini.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {swaps.map((swap) => {
        const iRequested = swap.requester.id === userId
        const other = iRequested ? swap.partner : swap.requester
        const myShift = iRequested ? swap.requesterShift : swap.partnerShift
        const otherShift = iRequested ? swap.partnerShift : swap.requesterShift

        return (
          <li key={swap.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{formatWorkDate(swap.workDate)}</span>
              <RequestStatusBadge status={swap.status} />
            </div>
            <p className="text-sm">
              {iRequested ? "Anda" : other.fullName} ↔ {iRequested ? other.fullName : "Anda"}
              <span className="text-muted-foreground">
                {" "}
                · jadwal Anda {formatShift(myShift)} → {formatShift(otherShift)}
              </span>
            </p>
            {!iRequested ? <p className="text-sm text-muted-foreground">Diajukan oleh {other.fullName}.</p> : null}
            {swap.note ? <p className="text-sm text-muted-foreground">Alasan: {swap.note}</p> : null}
            {swap.reviewNote ? <p className="text-sm">Catatan admin: {swap.reviewNote}</p> : null}
            {iRequested && swap.status === "pending" ? (
              <div>
                <CancelSwapButton swapId={swap.id} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
