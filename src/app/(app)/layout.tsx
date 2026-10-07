import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { AppSidebar } from "@/components/shared/app-sidebar"
import { AppSidebarSkeleton } from "@/components/shared/app-sidebar-skeleton"
import { PasswordReminder } from "@/components/shared/password-reminder"
import { SignOutButton } from "@/components/shared/sign-out-button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { requireUser } from "@/lib/auth"
import { countPendingRequests, countPendingSwaps } from "@/lib/db/schedules"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

async function SidebarLoader() {
  const user = await requireUser()
  // Kiosk-only accounts never see the dashboard shell.
  if (user.role === "admin_qr") redirect("/kiosk")
  const pendingRequests =
    user.role === "admin" ? (await Promise.all([countPendingRequests(), countPendingSwaps()])).reduce((a, b) => a + b, 0) : 0
  return <AppSidebar user={user} pendingRequests={pendingRequests} footer={<SignOutButton />} />
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebarSkeleton />}>
        <SidebarLoader />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="font-medium">QBS Presence</span>
        </header>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={null}>
            <PasswordReminder />
          </Suspense>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
