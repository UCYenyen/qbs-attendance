"use server"

import { authorize } from "@/lib/auth"
import { publicEnv } from "@/lib/env"
import { createQrToken } from "@/lib/qr"
import type { ActionResult, QrTokenResult } from "@/types/actions"

export async function issueQrTokenAction(): Promise<ActionResult<QrTokenResult>> {
  if (!(await authorize(["admin"]))) return { ok: false, error: "Hanya admin yang bisa menjalankan kiosk." }

  const { token, expiresAt } = createQrToken()
  const url = `${publicEnv.siteUrl}/scan/start?t=${encodeURIComponent(token)}`
  return { ok: true, data: { token, url, expiresAt } }
}
