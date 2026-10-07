import {
  ArrowLeftRightIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  HistoryIcon,
  HomeIcon,
  LayoutDashboardIcon,
  QrCodeIcon,
  SettingsIcon,
  UserCogIcon,
  StethoscopeIcon,
  UsersIcon,
} from "lucide-react"

import type { NavItem } from "@/types/navigation"
import type { UserRole } from "@/types/user"

export const ADMIN_NAV: readonly NavItem[] = [
  { title: "Ringkasan", href: "/admin", icon: LayoutDashboardIcon },
  { title: "Karyawan", href: "/admin/employees", icon: UsersIcon },
  { title: "Pengajuan jadwal", href: "/admin/schedule-requests", icon: ClipboardListIcon },
  { title: "QR Kiosk", href: "/kiosk", icon: QrCodeIcon },
  { title: "Pengaturan", href: "/admin/settings", icon: SettingsIcon },
  { title: "Akun saya", href: "/account", icon: UserCogIcon },
]

export const EMPLOYEE_NAV: readonly NavItem[] = [
  { title: "Hari ini", href: "/me", icon: HomeIcon },
  { title: "Jadwal saya", href: "/me/schedule", icon: CalendarClockIcon },
  { title: "Tukar jadwal", href: "/me/swap", icon: ArrowLeftRightIcon },
  { title: "Sakit / izin", href: "/me/leave", icon: StethoscopeIcon },
  { title: "Riwayat", href: "/me/history", icon: HistoryIcon },
  { title: "Akun saya", href: "/account", icon: UserCogIcon },
]

export const SCAN_NAV_ITEM: NavItem = { title: "Scan", href: "/scan", icon: CalendarCheckIcon }

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin"
    case "admin_qr":
      return "/kiosk"
    case "active_employee":
      return "/me"
    case "inactive_employee":
      return "/inactive"
  }
}

/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback
}
