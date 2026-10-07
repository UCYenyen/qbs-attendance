import type { Metadata } from "next"
import { UserXIcon } from "lucide-react"

import { signOutAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const metadata: Metadata = {
  title: "Akun nonaktif",
  description: "Akun QBS Presence Anda tidak aktif.",
  robots: { index: false, follow: false },
}

export default function InactivePage() {
  return (
    <Empty className="rounded-xl border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1 className="text-xl">Akun Anda nonaktif</h1>
        </EmptyTitle>
        <EmptyDescription>
          Anda belum bisa absen. Jika ini keliru, hubungi admin.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Keluar
          </Button>
        </form>
      </EmptyContent>
    </Empty>
  )
}
