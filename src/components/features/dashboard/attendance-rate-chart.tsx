"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatBucket } from "@/lib/date-range"
import { formatPercent } from "@/lib/format"
import type { Granularity, SeriesPoint } from "@/types/stats"

const chartConfig = {
  attendanceRate: { label: "Tingkat kehadiran", color: "var(--chart-1)" },
} satisfies ChartConfig

interface AttendanceRateChartProps {
  points: SeriesPoint[]
  granularity: Granularity
}

export function AttendanceRateChart({ points, granularity }: AttendanceRateChartProps) {
  const data = points.map((point) => ({ ...point, label: formatBucket(point.bucket, granularity) }))

  return (
    <>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-72">
        <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
          <defs>
            <linearGradient id="fill-rate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-attendanceRate)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-attendanceRate)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(value, _name, item) => {
                  const point = item.payload as SeriesPoint
                  return (
                    <div className="flex w-full flex-col gap-0.5">
                      <span className="font-medium tabular-nums">
                        {formatPercent(typeof value === "number" ? value : null)}
                      </span>
                      <span className="text-muted-foreground">
                        {point.attended}/{point.scheduled} hari hadir · {point.late} terlambat
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          <Area
            dataKey="attendanceRate"
            type="monotone"
            stroke="var(--color-attendanceRate)"
            strokeWidth={2}
            fill="url(#fill-rate)"
            dot={data.length <= 12 ? { r: 4, strokeWidth: 2, fill: "var(--background)" } : false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
            connectNulls={false}
          />
        </AreaChart>
      </ChartContainer>
      <ChartDataTable points={points} granularity={granularity} />
    </>
  )
}

/** Screen-reader table view of the same data. */
function ChartDataTable({ points, granularity }: AttendanceRateChartProps) {
  return (
    <table className="sr-only">
      <caption>Tingkat kehadiran per periode</caption>
      <thead>
        <tr>
          <th scope="col">Periode</th>
          <th scope="col">Tingkat kehadiran</th>
          <th scope="col">Hadir</th>
          <th scope="col">Terjadwal</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.bucket}>
            <td>{formatBucket(point.bucket, granularity)}</td>
            <td>{formatPercent(point.attendanceRate)}</td>
            <td>{point.attended}</td>
            <td>{point.scheduled}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
