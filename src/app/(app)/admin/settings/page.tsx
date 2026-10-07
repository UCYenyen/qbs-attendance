import type { Metadata } from "next"
import { Suspense } from "react"

import { PushToggle } from "@/components/features/notifications/push-toggle"
import { SettingsForm } from "@/components/features/settings/settings-form"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Atur notifikasi push dan aturan waktu absen.",
}

async function SettingsContent() {
  await requireRole(["admin"], "/admin/settings")
  const settings = await getAppSettings()
  return <SettingsForm initial={settings} />
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Pengaturan" description="Notifikasi dan aturan waktu absen." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Notifikasi push</CardTitle>
            <CardDescription>
              Dapatkan ringkasan kehadiran pukul 10.00 &amp; 23.15 WIB, dan pemberitahuan setiap ada pengajuan jadwal baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushToggle />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aturan waktu absen</CardTitle>
            <CardDescription>Berlaku untuk semua karyawan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-80" />}>
              <SettingsContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
