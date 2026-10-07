"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatBucket } from "@/lib/date-range"
import { formatHours } from "@/lib/format"
import type { Granularity, SeriesPoint } from "@/types/stats"

const chartConfig = {
  workedHours: { label: "Jam kerja", color: "var(--chart-3)" },
} satisfies ChartConfig

interface WorkingHoursChartProps {
  points: SeriesPoint[]
  granularity: Granularity
}

export function WorkingHoursChart({ points, granularity }: WorkingHoursChartProps) {
  const data = points.map((point) => ({ ...point, label: formatBucket(point.bucket, granularity) }))

  return (
    <>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-72">
        <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
          <YAxis
            tickFormatter={(value: number) => `${value} j`}
            tickLine={false}
            axisLine={false}
            width={52}
            allowDecimals={false}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const point = item.payload as SeriesPoint
                  return (
                    <div className="flex w-full flex-col gap-0.5">
                      <span className="font-medium tabular-nums">
                        {formatHours(typeof value === "number" ? value : null)} total
                      </span>
                      <span className="text-muted-foreground">
                        Rata-rata {formatHours(point.avgWorkedHours)} per hari
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          <Bar dataKey="workedHours" fill="var(--color-workedHours)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>Jam kerja per periode</caption>
        <thead>
          <tr>
            <th scope="col">Periode</th>
            <th scope="col">Total jam kerja</th>
            <th scope="col">Rata-rata per hari</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.bucket}>
              <td>{formatBucket(point.bucket, granularity)}</td>
              <td>{formatHours(point.workedHours)}</td>
              <td>{formatHours(point.avgWorkedHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
