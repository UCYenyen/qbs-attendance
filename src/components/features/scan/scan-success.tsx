import { CheckCircle2Icon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AttendanceSession } from "@/types/attendance"

interface ScanSuccessProps {
  session: AttendanceSession
  isLate: boolean
}

export function ScanSuccess({ session, isLate }: ScanSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center" role="status">
      <CheckCircle2Icon aria-hidden className="size-16 text-primary" />
      <h2 className="text-2xl">
        {session === "check_in" ? "Absen masuk berhasil. Selamat bekerja!" : "Absen pulang berhasil. Sampai jumpa!"}
      </h2>
      {isLate ? <Badge variant="outline">Tercatat terlambat</Badge> : null}
      <Button nativeButton={false} render={<Link href="/me" />}>
        Lihat status hari ini
      </Button>
    </div>
  )
}
