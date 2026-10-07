// Shared Web Push sender for Edge Functions (Deno).
import webpush from "npm:web-push@3.6.7"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2"

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
}

interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

interface PushError {
  statusCode?: number
}

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Requests from pg_net carry the shared cron secret; reject everything else. */
export function isAuthorized(request: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET")
  return Boolean(secret) && request.headers.get("x-cron-secret") === secret
}

/** Sends to every admin's subscriptions and prunes endpoints the push service reports as gone. */
export async function pushToAdmins(supabase: SupabaseClient, payload: PushPayload): Promise<number> {
  webpush.setVapidDetails(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"))

  const { data: admins, error: adminError } = await supabase.from("profiles").select("id").eq("role", "admin")
  if (adminError) throw adminError
  const adminIds = (admins ?? []).map((row: { id: string }) => row.id)
  if (adminIds.length === 0) return 0

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", adminIds)
  if (error) throw error
  const subscriptions = (data ?? []) as SubscriptionRow[]

  const body = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, {
        TTL: 60 * 60,
      }),
    ),
  )

  const stale = results.flatMap((result, index) => {
    if (result.status !== "rejected") return []
    const status = (result.reason as PushError).statusCode
    return status === 404 || status === 410 ? [subscriptions[index].endpoint] : []
  })
  if (stale.length > 0) await supabase.from("push_subscriptions").delete().in("endpoint", stale)

  return results.filter((result) => result.status === "fulfilled").length
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}
