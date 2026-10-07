import Link from "next/link"

import { RoleSelect } from "@/components/features/employees/role-select"
import { contactLabel } from "@/lib/accounts"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatHours, formatPercent } from "@/lib/format"
import type { EmployeeSummary } from "@/types/stats"

export function EmployeesTable({ employees }: { employees: EmployeeSummary[] }) {
  if (employees.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Belum ada karyawan</EmptyTitle>
          <EmptyDescription>Tambahkan karyawan pertama untuk mulai.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Karyawan</TableHead>
            <TableHead>Peran</TableHead>
            <TableHead className="text-right">Kehadiran</TableHead>
            <TableHead className="text-right">Jam kerja</TableHead>
            <TableHead className="text-right">Sakit / izin / alpa</TableHead>
            <TableHead>Jadwal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.userId}>
              <TableCell>
                <Link
                  href={`/admin/employees/${employee.userId}`}
                  className="flex flex-col font-medium underline-offset-4 hover:underline"
                >
                  {employee.fullName}
                  <span className="text-sm font-normal text-muted-foreground">
                    {contactLabel(employee.username, employee.email)}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <RoleSelect userId={employee.userId} role={employee.role} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(employee.attendanceRate)}
                <span className="block text-sm text-muted-foreground">
                  {employee.attended}/{employee.scheduled} hari
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatHours(employee.workedHours)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {employee.sick} / {employee.excused} / {employee.absent}
              </TableCell>
              <TableCell>
                {employee.hasPendingRequest ? (
                  <Badge variant="secondary">Menunggu review</Badge>
                ) : employee.hasSchedule ? (
                  <Badge variant="outline">Disetujui</Badge>
                ) : (
                  <Badge variant="destructive">Belum ada</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
