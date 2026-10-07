import type { Metadata } from "next"
import { Suspense } from "react"

import { LeaveForm } from "@/components/features/attendance/leave-form"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"
import { localNow, shiftDate } from "@/lib/time"

export const metadata: Metadata = {
  title: "Sakit / izin",
  description: "Laporkan sakit atau izin beserta catatan dan dokumen pendukung.",
}

async function LeaveContent() {
  await requireRole(["active_employee"], "/me/leave")
  const settings = await getAppSettings()
  const today = localNow(settings.timezone).date

  return <LeaveForm today={today} minDate={shiftDate(today, -7)} maxDate={shiftDate(today, 30)} />
}

export default function LeavePage() {
  return (
    <>
      <PageHeader title="Sakit / izin" description="Tidak bisa masuk? Beri tahu admin di sini." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Ajukan sakit atau izin</CardTitle>
          <CardDescription>
            Berlaku untuk absen masuk dan pulang di tanggal tersebut. Sesi yang sudah Anda hadiri tidak berubah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-80" />}>
            <LeaveContent />
          </Suspense>
        </CardContent>
      </Card>
    </>
  )
}
