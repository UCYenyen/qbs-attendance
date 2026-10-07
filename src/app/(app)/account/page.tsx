import type { Metadata } from "next"
import { Suspense } from "react"

import { ChangePasswordForm } from "@/components/features/account/change-password-form"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { isPlaceholderEmail } from "@/lib/accounts"
import { requireUser } from "@/lib/auth"
import { ROLE_LABELS } from "@/lib/format"
import { homePathForRole } from "@/lib/navigation"

export const metadata: Metadata = {
  title: "Akun saya",
  description: "Lihat data akun dan ganti kata sandi QBS Presence Anda.",
}

async function AccountContent() {
  const user = await requireUser("/account")
  const rows: [string, string][] = [
    ["Nama", user.fullName],
    ["Username", user.username ? `@${user.username}` : "—"],
    ["Email", isPlaceholderEmail(user.email) ? "—" : user.email],
    ["Peran", ROLE_LABELS[user.role]],
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Data akun</CardTitle>
          <CardDescription>Hubungi admin jika ada data yang perlu diubah.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell className="font-medium text-muted-foreground">{label}</TableCell>
                  <TableCell>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ganti kata sandi</CardTitle>
          <CardDescription>
            {user.mustChangePassword
              ? "Anda masih memakai kata sandi awal dari admin. Silakan ganti sekarang."
              : "Gunakan kata sandi yang hanya Anda ketahui."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm homePath={homePathForRole(user.role)} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Akun saya" description="Data akun dan keamanan." />
      <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
        <AccountContent />
      </Suspense>
    </>
  )
}
