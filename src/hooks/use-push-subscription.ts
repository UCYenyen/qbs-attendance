"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { subscribePushAction, unsubscribePushAction } from "@/actions/push"
import { publicEnv } from "@/lib/env"
import type { PushPermissionState } from "@/types/push"

export interface PushSubscriptionState {
  permission: PushPermissionState
  isSubscribed: boolean
  isBusy: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

function noopSubscribe(): () => void {
  return () => {}
}

function readPermission(): PushPermissionState {
  return isSupported() ? Notification.permission : "unsupported"
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
  return navigator.serviceWorker.ready
}

/** Registers the service worker and manages this device's Web Push subscription. */
export function usePushSubscription(): PushSubscriptionState {
  // Browser permission snapshot (server render assumes "default"); updated locally after prompting.
  const browserPermission = useSyncExternalStore(noopSubscribe, readPermission, () => "default" as const)
  const [promptedPermission, setPermission] = useState<PushPermissionState | null>(null)
  const permission = promptedPermission ?? browserPermission
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupported()) return
    void registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(sub !== null))
      .catch(() => setError("Layanan notifikasi gagal dijalankan."))
  }, [])

  async function subscribe() {
    if (!isSupported()) return
    if (!publicEnv.vapidPublicKey) {
      setError("Notifikasi push belum dikonfigurasi (VAPID key kosong).")
      return
    }
    setIsBusy(true)
    setError(null)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") {
        setError("Notifikasi diblokir. Izinkan di pengaturan browser.")
        return
      }
      const reg = await registration()
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey),
        }))
      const json = sub.toJSON()
      const saved = await subscribePushAction({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        userAgent: navigator.userAgent.slice(0, 400),
      })
      if (!saved.ok) {
        setError(saved.error)
        return
      }
      setIsSubscribed(true)
    } catch {
      setError("Gagal mengaktifkan notifikasi di perangkat ini.")
    } finally {
      setIsBusy(false)
    }
  }

  async function unsubscribe() {
    if (!isSupported()) return
    setIsBusy(true)
    setError(null)
    try {
      const reg = await registration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePushAction(sub.endpoint)
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch {
      setError("Gagal mematikan notifikasi.")
    } finally {
      setIsBusy(false)
    }
  }

  return { permission, isSubscribed, isBusy, error, subscribe, unsubscribe }
}
