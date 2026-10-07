import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { KioskQr } from "@/components/features/kiosk/kiosk-qr"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"

export const metadata: Metadata = {
  title: "QR Kiosk",
  description: "Tampilkan QR absensi yang berganti setiap menit di layar kantor.",
  robots: { index: false, follow: false },
}

async function KioskContent() {
  await requireRole(["admin"], "/kiosk")
  const settings = await getAppSettings()
  return <KioskQr timezone={settings.timezone} />
}

export default function KioskPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center bg-gradient-to-b from-secondary/70 to-background p-6">
      <Button
        variant="ghost"
        className="absolute top-4 left-4"
        nativeButton={false}
        render={<Link href="/admin" />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Dashboard
      </Button>
      <Suspense fallback={<Skeleton className="size-96 rounded-3xl" />}>
        <KioskContent />
      </Suspense>
    </main>
  )
}
