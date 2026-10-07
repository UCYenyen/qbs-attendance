"use server"

import { authorize } from "@/lib/auth"
import { deleteOwnSubscription, deleteStaleSubscriptions, listOwnSubscriptions, saveSubscription } from "@/lib/db/push"
import { sendPush } from "@/lib/push"
import { pushSubscriptionSchema } from "@/lib/validation"
import type { ActionResult } from "@/types/actions"
import type { PushSubscriptionInput } from "@/types/push"

export async function subscribePushAction(input: PushSubscriptionInput): Promise<ActionResult> {
  const user = await authorize(["admin", "active_employee"])
  if (!user) return { ok: false, error: "Masuk terlebih dahulu untuk mengaktifkan notifikasi." }

  const parsed = pushSubscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Langganan notifikasi tidak valid." }

  try {
    await saveSubscription(user.id, parsed.data)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal menyimpan." }
  }
  return { ok: true, data: undefined, message: "Notifikasi aktif di perangkat ini." }
}

export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  if (!(await authorize(["admin", "active_employee"]))) return { ok: false, error: "Belum masuk." }
  try {
    await deleteOwnSubscription(endpoint)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal menghapus." }
  }
  return { ok: true, data: undefined, message: "Notifikasi dimatikan di perangkat ini." }
}

export async function sendTestPushAction(): Promise<ActionResult> {
  const user = await authorize(["admin"])
  if (!user) return { ok: false, error: "Hanya admin yang bisa mengirim notifikasi uji." }

  const subscriptions = await listOwnSubscriptions(user.id)
  if (subscriptions.length === 0) return { ok: false, error: "Aktifkan notifikasi terlebih dahulu." }

  try {
    const result = await sendPush(subscriptions, {
      title: "QBS Presence",
      body: "Notifikasi uji — semuanya sudah siap!",
      url: "/admin",
      tag: "test",
    })
    await deleteStaleSubscriptions(result.staleEndpoints)
    return { ok: true, data: undefined, message: `Terkirim ke ${result.sent} perangkat.` }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mengirim notifikasi." }
  }
}
