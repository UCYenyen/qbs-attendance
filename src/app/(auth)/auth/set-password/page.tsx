import type { Metadata } from "next"

import { SetPasswordForm } from "@/components/features/auth/set-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Buat kata sandi",
  description: "Buat kata sandi untuk akun QBS Presence Anda.",
  robots: { index: false, follow: false },
}

export default function SetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Buat kata sandi</h1>
        </CardTitle>
        <CardDescription>Kata sandi ini dipakai bersama email untuk masuk.</CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm />
      </CardContent>
    </Card>
  )
}
