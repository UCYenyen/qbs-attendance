import { ClockAlertIcon, LogOutIcon, StethoscopeIcon, UserCheckIcon, UserXIcon } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import { formatPercent } from "@/lib/format"
import type { TodaySummary } from "@/types/stats"

export function TodaySummaryCards({ summary }: { summary: TodaySummary | null }) {
  const s = summary ?? {
    workDate: "",
    expected: 0,
    checkedIn: 0,
    late: 0,
    checkedOut: 0,
    sick: 0,
    excused: 0,
    notPresent: 0,
    attendanceRate: null,
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        icon={UserCheckIcon}
        label="Hadir hari ini"
        value={`${s.checkedIn}/${s.expected}`}
        hint={`Tingkat kehadiran ${formatPercent(s.attendanceRate)}`}
      />
      <StatCard icon={ClockAlertIcon} label="Terlambat" value={String(s.late)} hint="Masuk lewat batas toleransi" />
      <StatCard icon={LogOutIcon} label="Sudah pulang" value={String(s.checkedOut)} hint="Absen pulang tercatat" />
      <StatCard icon={StethoscopeIcon} label="Sakit / izin" value={`${s.sick} / ${s.excused}`} hint="Dengan catatan" />
      <StatCard icon={UserXIcon} label="Belum hadir / alpa" value={String(s.notPresent)} hint="Belum absen masuk" />
    </div>
  )
}
