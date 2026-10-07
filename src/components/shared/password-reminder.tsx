import { KeyRoundIcon } from "lucide-react"
import Link from "next/link"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"

/** Nudges users still on an owner-set default password to change it. */
export async function PasswordReminder() {
  const user = await getCurrentUser()
  if (!user?.mustChangePassword) return null

  return (
    <Alert>
      <KeyRoundIcon />
      <AlertTitle>Ganti kata sandi awal Anda</AlertTitle>
      <AlertDescription>Anda masih memakai kata sandi dari admin. Ganti dengan kata sandi milik Anda sendiri.</AlertDescription>
      <AlertAction>
        <Button size="sm" nativeButton={false} render={<Link href="/account" />}>
          Ganti sekarang
        </Button>
      </AlertAction>
    </Alert>
  )
}
