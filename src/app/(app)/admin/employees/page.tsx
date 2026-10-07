import type { Metadata } from "next"
import { Suspense } from "react"

import { EmployeesTable } from "@/components/features/employees/employees-table"
import { InviteDialog } from "@/components/features/employees/invite-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth"
import { getAppSettings } from "@/lib/db/settings"
import { getEmployeeSummaries } from "@/lib/db/stats"
import { localNow, shiftDate } from "@/lib/time"

export const metadata: Metadata = {
  title: "Karyawan",
  description: "Daftar karyawan beserta peran, tingkat kehadiran, jam kerja, dan status jadwal 30 hari terakhir.",
}

async function EmployeesContent() {
  await requireRole(["admin"], "/admin/employees")
  const settings = await getAppSettings()
  const today = localNow(settings.timezone).date
  const employees = await getEmployeeSummaries(shiftDate(today, -29), today)
  return <EmployeesTable employees={employees} />
}

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        title="Karyawan"
        description="Statistik 30 hari terakhir. Klik nama untuk melihat jadwal dan grafik per karyawan."
        actions={<InviteDialog />}
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <EmployeesContent />
      </Suspense>
    </>
  )
}
