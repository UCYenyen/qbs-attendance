import "server-only"

import webpush, { type PushSubscription, WebPushError } from "web-push"

import { publicEnv } from "@/lib/env"
import { serverEnv } from "@/lib/env.server"
import type { PushPayload } from "@/types/push"

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSendResult {
  sent: number
  staleEndpoints: string[]
}

/** Sends a payload to every subscription; reports endpoints the push service says are gone. */
export async function sendPush(
  subscriptions: StoredSubscription[],
  payload: PushPayload,
): Promise<PushSendResult> {
  webpush.setVapidDetails(
    serverEnv.vapidSubject,
    publicEnv.vapidPublicKey,
    serverEnv.vapidPrivateKey,
  )

  const body = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subscriptions.map((sub) => {
      const target: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      return webpush.sendNotification(target, body, { TTL: 60 * 60 })
    }),
  )

  const staleEndpoints = results.flatMap((result, index) =>
    result.status === "rejected" &&
    result.reason instanceof WebPushError &&
    (result.reason.statusCode === 404 || result.reason.statusCode === 410)
      ? [subscriptions[index].endpoint]
      : [],
  )

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    staleEndpoints,
  }
}
