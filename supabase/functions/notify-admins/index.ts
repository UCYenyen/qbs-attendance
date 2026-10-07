// Called by DB triggers (pg_net) on new schedule requests and schedule swaps. Pushes to all admins.
import { adminClient, isAuthorized, json, pushToAdmins, type PushPayload } from "../_shared/push.ts"

interface NotifyBody {
  type?: string
  request_id?: string
  swap_id?: string
  user_id?: string
}

interface ProfileRow {
  full_name: string | null
  username: string | null
  email: string | null
}

function nameOf(profile: ProfileRow | null | undefined): string {
  return profile?.full_name || profile?.username || profile?.email || "Seorang karyawan"
}

/** "Rabu, 8 Oktober" for a yyyy-MM-dd calendar date. */
function formatDate(workDate: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${workDate}T00:00:00Z`))
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401)

  const body = (await request.json().catch(() => ({}))) as NotifyBody
  const supabase = adminClient()
  let payload: PushPayload

  if (body.type === "schedule_request" && body.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, email")
      .eq("id", body.user_id)
      .maybeSingle()

    payload = {
      title: "Pengajuan jadwal baru",
      body: `${nameOf(profile)} mengajukan jadwal kerja mingguan. Ketuk untuk mereview.`,
      url: "/admin/schedule-requests",
      tag: `schedule-request-${body.request_id ?? body.user_id}`,
    }
  } else if (body.type === "schedule_swap" && body.swap_id) {
    const { data: swap } = await supabase
      .from("schedule_swaps")
      .select(
        "work_date, requester:profiles!schedule_swaps_requester_id_fkey(full_name, username, email), partner:profiles!schedule_swaps_partner_id_fkey(full_name, username, email)",
      )
      .eq("id", body.swap_id)
      .maybeSingle()
    if (!swap) return json({ error: "Swap not found" }, 404)

    const requester = swap.requester as unknown as ProfileRow | null
    const partner = swap.partner as unknown as ProfileRow | null
    payload = {
      title: "Pengajuan tukar jadwal",
      body: `${nameOf(requester)} ↔ ${nameOf(partner)} pada ${formatDate(swap.work_date)}. Ketuk untuk mereview.`,
      url: "/admin/schedule-requests",
      tag: `schedule-swap-${body.swap_id}`,
    }
  } else {
    return json({ error: "Unsupported event" }, 400)
  }

  const sent = await pushToAdmins(supabase, payload)
  return json({ sent })
})
