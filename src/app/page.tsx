import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Spinner } from "@/components/ui/spinner"
import { getCurrentUser } from "@/lib/auth"
import { homePathForRole } from "@/lib/navigation"

export const metadata: Metadata = {
  title: { absolute: "QBS Presence — Absensi karyawan" },
  description:
    "Absen masuk dan pulang dengan QR yang berganti tiap menit, ajukan jadwal mingguan, dan pantau kehadiran di QBS.",
}

async function RoleRedirect(): Promise<null> {
  const user = await getCurrentUser()
  redirect(user ? homePathForRole(user.role) : "/login")
}

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="sr-only">QBS Presence</h1>
      <Suspense fallback={<Spinner className="size-6 text-primary" />}>
        <RoleRedirect />
      </Suspense>
    </main>
  )
}
