import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { Suspense } from "react"

import { ScanFlow } from "@/components/features/scan/scan-flow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getRecordedSessions } from "@/lib/db/attendance"
import { getApprovedSchedule, getOverrides } from "@/lib/db/schedules"
import { getAppSettings } from "@/lib/db/settings"
import { SCAN_PASS_COOKIE, verifyScanPass } from "@/lib/qr"
import { formatInTz, localNow, resolveOpenSession, shiftDate } from "@/lib/time"

export const metadata: Metadata = {
  title: "Absen",
  description: "Absen masuk atau pulang dengan selfie setelah scan QR kiosk.",
  robots: { index: false, follow: false },
}

function Notice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      <Button variant="outline" nativeButton={false} render={<Link href="/me" />}>
        Ke halaman saya
      </Button>
    </div>
  )
}

async function ScanContent({ searchParams }: { searchParams: PageProps<"/scan">["searchParams"] }) {
  const { error } = await searchParams
  if (error === "expired") {
    return (
      <Notice
        title="QR sudah kedaluwarsa"
        description="Kode QR berganti setiap 30 detik. Scan ulang kode yang tampil di kiosk."
      />
    )
  }

  const user = await requireRole(["active_employee"], "/scan")
  const cookieStore = await cookies()
  if (!verifyScanPass(cookieStore.get(SCAN_PASS_COOKIE)?.value)) {
    return <Notice title="Scan QR di kiosk" description="Untuk absen, scan kode QR yang tampil di layar kiosk kantor." />
  }

  const [schedule, settings] = await Promise.all([getApprovedSchedule(user.id), getAppSettings()])
  if (!schedule) {
    return <Notice title="Jadwal belum disetujui" description="Atur jadwal kerja Anda dan tunggu persetujuan admin." />
  }

  const today = localNow(settings.timezone).date
  const dates = [today, shiftDate(today, -1)]
  const [recorded, overrides] = await Promise.all([
    getRecordedSessions(user.id, dates),
    getOverrides(user.id, dates),
  ])
  const open = resolveOpenSession(schedule, settings, recorded, overrides)

  if (open.kind === "not_working_day") {
    return <Notice title="Hari ini libur" description="Anda tidak dijadwalkan bekerja hari ini." />
  }
  if (open.kind === "no_open_window") {
    return (
      <Notice
        title="Belum waktunya absen"
        description={
          open.nextWindow
            ? `Absen berikutnya dibuka pukul ${formatInTz(open.nextWindow, settings.timezone, "HH:mm")}.`
            : "Anda sudah absen atau waktu absen hari ini sudah lewat."
        }
      />
    )
  }

  return (
    <>
      <p className="text-center text-muted-foreground">
        Halo, {user.fullName}. Jadwal {open.session === "check_in" ? "masuk" : "pulang"} pukul{" "}
        {formatInTz(open.expectedAt, settings.timezone, "HH:mm")}.
      </p>
      <ScanFlow session={open.session} isLate={open.isLate} />
    </>
  )
}

export default function ScanPage({ searchParams }: PageProps<"/scan">) {
  return (
    <main className="flex flex-1 items-start justify-center bg-gradient-to-b from-secondary/60 to-background p-4 sm:items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Absen</h1>
          </CardTitle>
          <CardDescription>Ambil selfie sebagai bukti kehadiran.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense fallback={<Skeleton className="aspect-[3/4] w-full rounded-2xl" />}>
            <ScanContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
