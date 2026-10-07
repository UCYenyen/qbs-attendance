import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format"
import type { WeeklySchedule } from "@/types/schedule"

interface ScheduleSummaryProps {
  schedule: WeeklySchedule
  compareTo?: WeeklySchedule | null
}

/** Read-only weekly schedule; highlights rows that differ from `compareTo`. */
export function ScheduleSummary({ schedule, compareTo }: ScheduleSummaryProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hari</TableHead>
          <TableHead>Jam kerja</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {WEEKDAY_ORDER.map((weekday) => {
          const day = schedule.find((d) => d.weekday === weekday)
          const before = compareTo?.find((d) => d.weekday === weekday)
          const changed =
            compareTo !== undefined &&
            (!before ||
              before.isWorkingDay !== day?.isWorkingDay ||
              (day?.isWorkingDay && (before.startTime !== day.startTime || before.endTime !== day.endTime)))

          return (
            <TableRow key={weekday} data-state={changed ? "selected" : undefined}>
              <TableCell className="font-medium">{WEEKDAY_LABELS[weekday]}</TableCell>
              <TableCell className="tabular-nums">
                {day?.isWorkingDay ? `${day.startTime} – ${day.endTime}` : <span className="text-muted-foreground">Libur</span>}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
