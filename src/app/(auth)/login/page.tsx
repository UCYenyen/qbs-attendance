import type { Metadata } from "next"
import { Suspense } from "react"

import { LoginForm } from "@/components/features/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { safeNextPath } from "@/lib/navigation"

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke QBS Presence untuk absen, mengatur jadwal, dan melihat kehadiran.",
}

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams
  const nextPath = safeNextPath(typeof next === "string" ? next : null, "")
  return <LoginForm next={nextPath} />
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Selamat datang</h1>
        </CardTitle>
        <CardDescription>Masuk dengan akun yang diundang oleh admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-56" />}>
          <LoginFormWithNext searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
