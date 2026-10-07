"use server"

import { authorize } from "@/lib/auth"
import { publicEnv } from "@/lib/env"
import { createQrToken } from "@/lib/qr"
import type { ActionResult, QrTokenResult } from "@/types/actions"

export async function issueQrTokenAction(): Promise<ActionResult<QrTokenResult>> {
  if (!(await authorize(["admin", "admin_qr"]))) {
    return { ok: false, error: "Hanya admin atau admin QR yang bisa menampilkan QR." }
  }

  const { token, expiresAt } = createQrToken()
  const url = `${publicEnv.siteUrl}/scan/start?t=${encodeURIComponent(token)}`
  return { ok: true, data: { token, url, expiresAt } }
}
