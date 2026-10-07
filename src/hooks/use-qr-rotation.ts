"use client"

import { useEffect, useState } from "react"

import { issueQrTokenAction } from "@/actions/kiosk"
import type { QrTokenResult } from "@/types/actions"

export interface QrRotationState {
  qr: QrTokenResult | null
  secondsLeft: number
  error: string | null
}

/** Fetches a fresh signed QR token whenever the current one expires (every 30 seconds). */
export function useQrRotation(): QrRotationState {
  const [qr, setQr] = useState<QrTokenResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined

    async function load() {
      const result = await issueQrTokenAction()
      if (cancelled) return
      if (result.ok) {
        setQr(result.data)
        setError(null)
        // Small buffer so the server is already in the next rotation window.
        timeout = setTimeout(load, Math.max(result.data.expiresAt - Date.now() + 250, 1000))
      } else {
        setError(result.error)
        timeout = setTimeout(load, 10_000)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const secondsLeft = qr ? Math.max(Math.ceil((qr.expiresAt - now) / 1000), 0) : 0
  return { qr, secondsLeft, error }
}
