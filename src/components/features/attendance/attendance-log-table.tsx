import { FileTextIcon, ImageIcon } from "lucide-react"

import { AttendanceStatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatHours, formatWorkDate } from "@/lib/format"
import { formatInTz } from "@/lib/time"
import type { AttendanceDay } from "@/types/attendance"

interface AttendanceLogTableProps {
  days: AttendanceDay[]
  timezone: string
}

export function AttendanceLogTable({ days, timezone }: AttendanceLogTableProps) {
  if (days.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Belum ada data absensi</EmptyTitle>
          <EmptyDescription>Data akan muncul setelah absen pertama.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Masuk</TableHead>
            <TableHead>Pulang</TableHead>
            <TableHead>Jam kerja</TableHead>
            <TableHead>Catatan & bukti</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.workDate}>
              <TableCell className="whitespace-nowrap font-medium">
                {formatWorkDate(day.workDate, "EEE, d MMM yyyy")}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <AttendanceStatusBadge status={day.status} />
                  {day.isLate ? <Badge variant="outline">Terlambat</Badge> : null}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">
                {day.checkInAt ? formatInTz(day.checkInAt, timezone, "HH:mm") : "—"}
              </TableCell>
              <TableCell className="tabular-nums">
                {day.checkOutAt ? formatInTz(day.checkOutAt, timezone, "HH:mm") : "—"}
              </TableCell>
              <TableCell className="tabular-nums">{formatHours(day.workedHours)}</TableCell>
              <TableCell>
                <div className="flex max-w-xs flex-col gap-1">
                  {day.note ? <span className="text-sm">{day.note}</span> : null}
                  <div className="flex flex-wrap gap-2">
                    {day.proofs.map((proof) => (
                      <a
                        key={proof.publicId}
                        href={proof.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {proof.resourceType === "image" ? <ImageIcon aria-hidden className="size-4" /> : <FileTextIcon aria-hidden className="size-4" />}
                        {proof.session === "check_in" ? "Bukti masuk" : "Bukti pulang"}
                      </a>
                    ))}
                  </div>
                  {!day.note && day.proofs.length === 0 ? <span className="text-muted-foreground">—</span> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
