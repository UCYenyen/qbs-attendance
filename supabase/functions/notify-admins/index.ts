// Called by the schedule_requests insert trigger (pg_net). Tells admins to review the new schedule.
import { adminClient, isAuthorized, json, pushToAdmins } from "../_shared/push.ts"

interface NotifyBody {
  type?: string
  request_id?: string
  user_id?: string
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401)

  const body = (await request.json().catch(() => ({}))) as NotifyBody
  if (body.type !== "schedule_request" || !body.user_id) return json({ error: "Unsupported event" }, 400)

  const supabase = adminClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", body.user_id)
    .maybeSingle()
  const name = profile?.full_name || profile?.email || "Seorang karyawan"

  const sent = await pushToAdmins(supabase, {
    title: "Pengajuan jadwal baru",
    body: `${name} mengajukan jadwal kerja. Ketuk untuk mereview.`,
    url: "/admin/schedule-requests",
    tag: `schedule-request-${body.request_id ?? body.user_id}`,
  })

  return json({ sent })
})
