import type { Metadata } from "next"

import { AuthCallback } from "@/components/features/auth/auth-callback"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Memproses link",
  description: "Menyelesaikan proses masuk dari link email QBS Presence.",
  robots: { index: false, follow: false },
}

export default function AuthCallbackPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Sebentar…</h1>
        </CardTitle>
        <CardDescription>Kami sedang memverifikasi link dari email Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthCallback />
      </CardContent>
    </Card>
  )
}
