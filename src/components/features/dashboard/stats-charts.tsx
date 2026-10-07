import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceRateChart } from "@/components/features/dashboard/attendance-rate-chart"
import { WorkingHoursChart } from "@/components/features/dashboard/working-hours-chart"
import { RANGE_LABELS } from "@/lib/date-range"
import { formatHours, formatPercent } from "@/lib/format"
import type { SeriesPoint, SeriesTotals, StatsRange } from "@/types/stats"

interface StatsChartsProps {
  range: StatsRange
  points: SeriesPoint[]
  totals: SeriesTotals
  scopeLabel: string
}

/** Attendance-rate + working-hours charts side by side (stacked on mobile). */
export function StatsCharts({ range, points, totals, scopeLabel }: StatsChartsProps) {
  const period = RANGE_LABELS[range.key].toLowerCase()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tingkat kehadiran {scopeLabel}</CardTitle>
          <CardDescription>
            {formatPercent(totals.attendanceRate)} · {totals.attended} dari {totals.scheduled} hari kerja ({period})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceRateChart points={points} granularity={range.granularity} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Jam kerja {scopeLabel}</CardTitle>
          <CardDescription>
            Total {formatHours(totals.workedHours)} ({period})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkingHoursChart points={points} granularity={range.granularity} />
        </CardContent>
      </Card>
    </div>
  )
}
