import type { Metadata } from "next"
import { Suspense } from "react"

import { MySwapsList } from "@/components/features/swaps/my-swaps-list"
import { SwapRequestForm } from "@/components/features/swaps/swap-request-form"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"
import { listMySwaps, listSwapPartners } from "@/lib/db/swaps"
import { localNow, shiftDate } from "@/lib/time"

export const metadata: Metadata = {
  title: "Tukar jadwal",
  description: "Ajukan tukar jadwal dengan rekan kerja untuk satu hari tertentu. Perlu persetujuan admin.",
}

async function SwapContent() {
  const user = await requireRole(["active_employee"], "/me/swap")
  const settings = await getAppSettings()
  const today = localNow(settings.timezone).date
  const [partners, swaps] = await Promise.all([listSwapPartners(user.id), listMySwaps(user.id)])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Ajukan tukar jadwal</CardTitle>
          <CardDescription>
            Di tanggal yang dipilih, Anda memakai jadwal rekan dan rekan memakai jadwal Anda. Berlaku setelah disetujui
            admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SwapRequestForm partners={partners} minDate={today} maxDate={shiftDate(today, 60)} />
        </CardContent>
      </Card>
      <section className="flex min-w-0 flex-col gap-3">
        <h2>Riwayat tukar jadwal</h2>
        <MySwapsList swaps={swaps} userId={user.id} />
      </section>
    </div>
  )
}

export default function SwapPage() {
  return (
    <>
      <PageHeader title="Tukar jadwal" description="Tukar jadwal dengan rekan untuk satu hari saja." />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <SwapContent />
      </Suspense>
    </>
  )
}
