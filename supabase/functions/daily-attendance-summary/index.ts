// Called by pg_cron (morning + night). Pushes today's attendance counts to every admin.
import { adminClient, isAuthorized, json, pushToAdmins } from "../_shared/push.ts"

interface SummaryRow {
  work_date: string
  expected: number
  checked_in: number
  late: number
  checked_out: number
  sick: number
  excused: number
  not_present: number
  attendance_rate: number | null
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401)

  const { period } = (await request.json().catch(() => ({}))) as { period?: string }
  const isNight = period === "night"

  const supabase = adminClient()
  const { data, error } = await supabase.rpc("today_summary", {})
  if (error) return json({ error: error.message }, 500)

  const s = (data as SummaryRow[])[0]
  if (!s || s.expected === 0) return json({ sent: 0, skipped: "Tidak ada karyawan terjadwal hari ini" })

  const rate = s.attendance_rate === null ? "—" : `${s.attendance_rate}%`
  const body = isNight
    ? `Hadir ${s.checked_in}/${s.expected} (${rate}) · Sudah pulang ${s.checked_out} · Sakit ${s.sick} · Izin ${s.excused} · Alpa ${s.not_present}`
    : `Hadir ${s.checked_in}/${s.expected} (${s.late} terlambat) · Sakit ${s.sick} · Izin ${s.excused} · Belum hadir ${s.not_present}`

  const sent = await pushToAdmins(supabase, {
    title: isNight ? "Ringkasan absensi malam" : "Ringkasan absensi pagi",
    body,
    url: "/admin",
    tag: `daily-summary-${s.work_date}-${isNight ? "night" : "morning"}`,
  })

  return json({ sent })
})
