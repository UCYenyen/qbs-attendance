import type { Metadata } from "next"
import { ArrowLeftIcon, LogOutIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { signOutAction } from "@/actions/auth"
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
  const user = await requireRole(["admin", "admin_qr"], "/kiosk")
  const settings = await getAppSettings()

  return (
    <>
      <div className="absolute top-4 left-4">
        {user.role === "admin" ? (
          <Button variant="ghost" nativeButton={false} render={<Link href="/admin" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Dashboard
          </Button>
        ) : (
          <form action={signOutAction}>
            <Button type="submit" variant="ghost">
              <LogOutIcon data-icon="inline-start" />
              Keluar
            </Button>
          </form>
        )}
      </div>
      <KioskQr timezone={settings.timezone} />
    </>
  )
}

export default function KioskPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center bg-gradient-to-b from-secondary/70 to-background p-6">
      <Suspense fallback={<Skeleton className="size-96 rounded-3xl" />}>
        <KioskContent />
      </Suspense>
    </main>
  )
}
