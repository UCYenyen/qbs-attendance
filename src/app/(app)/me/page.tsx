import type { Metadata } from "next"
import { CalendarClockIcon, QrCodeIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { TodayStatusCard } from "@/components/features/attendance/today-status-card"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { getRecordedSessions, getTodayStatus } from "@/lib/db/attendance"
import { getApprovedSchedule, getMyScheduleState, getOverrides } from "@/lib/db/schedules"
import { getAppSettings } from "@/lib/db/settings"
import { formatInTz, localNow, resolveOpenSession, shiftDate, shiftOn } from "@/lib/time"

export const metadata: Metadata = {
  title: "Hari ini",
  description: "Status absen masuk dan pulang Anda hari ini.",
}

async function TodayContent() {
  const user = await requireRole(["active_employee"], "/me")
  const [settings, schedule, scheduleState] = await Promise.all([
    getAppSettings(),
    getApprovedSchedule(user.id),
    getMyScheduleState(user.id),
  ])
  const now = localNow(settings.timezone)

  if (!schedule) {
    return (
      <Alert>
        <CalendarClockIcon />
        <AlertTitle>Atur jadwal kerja terlebih dahulu</AlertTitle>
        <AlertDescription>
          {scheduleState.isLocked
            ? "Jadwal Anda sedang menunggu persetujuan admin. Anda bisa absen setelah disetujui."
            : "Isi jadwal mingguan Anda. Setelah disetujui admin, Anda bisa mulai absen."}
        </AlertDescription>
        <AlertAction>
          <Button nativeButton={false} render={<Link href="/me/schedule" />}>
            Buka jadwal
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  const dates = [now.date, shiftDate(now.date, -1)]
  const [status, recorded, overrides] = await Promise.all([
    getTodayStatus(user.id, now.date),
    getRecordedSessions(user.id, dates),
    getOverrides(user.id, dates),
  ])
  const scheduleToday = shiftOn(schedule, overrides, now.date)
  const isSwappedToday = overrides.some((o) => o.workDate === now.date)
  const open = resolveOpenSession(schedule, settings, recorded, overrides)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TodayStatusCard
        status={status}
        scheduleToday={scheduleToday}
        isSwapped={isSwappedToday}
        timezone={settings.timezone}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCodeIcon aria-hidden className="text-primary" />
            Cara absen
          </CardTitle>
          <CardDescription>
            {open.kind === "open"
              ? `Waktu ${open.session === "check_in" ? "absen masuk" : "absen pulang"} sedang dibuka.`
              : open.kind === "not_working_day"
                ? "Hari ini Anda libur."
                : open.nextWindow
                  ? `Absen berikutnya dibuka pukul ${formatInTz(open.nextWindow, settings.timezone, "HH:mm")}.`
                  : "Tidak ada waktu absen lagi hari ini."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>Buka kamera HP dan arahkan ke QR di layar kiosk kantor.</li>
            <li>Ketuk link yang muncul. QR berganti setiap 30 detik.</li>
            <li>Ambil selfie sebagai bukti kehadiran, lalu kirim.</li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            Absen dibuka {settings.windowBeforeMin} menit sebelum hingga {settings.windowAfterMin} menit setelah jam
            jadwal. Lewat {settings.lateGraceMinutes} menit dari jam masuk dihitung terlambat.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Hari ini" description="Status absen masuk dan pulang Anda." />
      <Suspense fallback={<PageSkeleton />}>
        <TodayContent />
      </Suspense>
    </>
  )
}
