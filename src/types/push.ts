export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent: string | null
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
}

export type PushPermissionState = "unsupported" | "default" | "denied" | "granted"
