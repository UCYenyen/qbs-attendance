import { ClockIcon, LogInIcon, LogOutIcon } from "lucide-react"

import { AttendanceStatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatWorkDate } from "@/lib/format"
import { formatInTz } from "@/lib/time"
import type { AttendanceRecord, TodayStatus } from "@/types/attendance"
import type { Shift } from "@/types/schedule"

interface TodayStatusCardProps {
  status: TodayStatus
  scheduleToday: Shift
  /** True when an approved one-day swap replaced today's weekly schedule. */
  isSwapped: boolean
  timezone: string
}

function SessionRow({
  label,
  expected,
  record,
  timezone,
  icon: Icon,
}: {
  label: string
  expected: string | null
  record: AttendanceRecord | null
  timezone: string
  icon: typeof LogInIcon
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Icon aria-hidden />
        </span>
        <div className="flex flex-col">
          <span className="font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">
            {expected ? `Jadwal ${expected}` : "Tidak dijadwalkan"}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {record ? (
          <>
            <AttendanceStatusBadge status={record.status} />
            {record.status === "attend" ? (
              <span className="text-sm tabular-nums">{formatInTz(record.created_at, timezone, "HH:mm")}</span>
            ) : null}
            {record.is_late ? <Badge variant="outline">Terlambat</Badge> : null}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Belum absen</span>
        )}
      </div>
    </div>
  )
}

export function TodayStatusCard({ status, scheduleToday, isSwapped, timezone }: TodayStatusCardProps) {
  const working = scheduleToday.isWorkingDay

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon aria-hidden className="text-primary" />
          Status hari ini
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {formatWorkDate(status.workDate)}
          {isSwapped ? <Badge variant="secondary">Jadwal ditukar</Badge> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SessionRow
          label="Absen masuk"
          expected={working ? scheduleToday.startTime : null}
          record={status.checkIn}
          timezone={timezone}
          icon={LogInIcon}
        />
        <Separator />
        <SessionRow
          label="Absen pulang"
          expected={working ? scheduleToday.endTime : null}
          record={status.checkOut}
          timezone={timezone}
          icon={LogOutIcon}
        />
      </CardContent>
    </Card>
  )
}
