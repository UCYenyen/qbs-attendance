"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { safeNextPath } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Finishes Supabase's default email links (invite / recovery). Those redirect here with the
 * session in the URL hash (`#access_token=…`) or a PKCE `?code=`, which only the browser can read.
 */
export function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const next = safeNextPath(url.searchParams.get("next"), "/")

    async function finish() {
      const linkError = hash.get("error_description") ?? url.searchParams.get("error_description")
      if (linkError) {
        setError("Link sudah kedaluwarsa atau sudah pernah dipakai. Minta undangan baru ke admin.")
        return
      }

      const code = url.searchParams.get("code")
      const accessToken = hash.get("access_token")
      const refreshToken = hash.get("refresh_token")

      const { error: sessionError } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : { error: new Error("missing token") }

      if (sessionError) {
        setError("Link tidak valid. Minta undangan baru ke admin.")
        return
      }
      router.replace(next)
      router.refresh()
    }

    void finish()
  }, [router])

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertTitle>Gagal masuk</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Ke halaman masuk
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-muted-foreground" aria-live="polite">
      <Spinner />
      Memproses link…
    </div>
  )
}
