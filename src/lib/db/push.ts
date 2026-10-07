import "server-only"

import type { StoredSubscription } from "@/lib/push"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { PushSubscriptionInput } from "@/types/push"

/** A browser endpoint belongs to whoever subscribed last on that device. */
export async function saveSubscription(userId: string, input: PushSubscriptionInput): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      user_agent: input.userAgent,
    },
    { onConflict: "endpoint" },
  )
  if (error) throw new Error(error.message)
}

export async function deleteOwnSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  if (error) throw new Error(error.message)
}

export async function listOwnSubscriptions(userId: string): Promise<StoredSubscription[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
  return data
}

export async function deleteStaleSubscriptions(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return
  const admin = createAdminClient()
  await admin.from("push_subscriptions").delete().in("endpoint", endpoints)
}
